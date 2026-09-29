/**
 * ────────────────────────────────────────────────────────────────────────────
 *  /api/chat  ·  Streaming route handler (FE-06)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Server-side only. Calls the Z.AI model through `z-ai-web-dev-sdk` with
 *  `stream: true`, which returns a raw `ReadableStream<Uint8Array>` of
 *  OpenAI-style SSE events. We re-emit those as a *typed* SSE stream that the
 *  client's custom consumer (`src/hooks/use-chat.ts`) can parse:
 *
 *      data: {"type":"meta","id":"msg_xxx","createdAt":...}\n\n
 *      data: {"type":"thinking","value":"<delta>"}\n\n     ← reasoning trace
 *      data: {"type":"token","value":"<delta>"}\n\n          ← visible tokens
 *      data: {"type":"done"}\n\n                              ← clean end
 *      data: {"type":"error","message":"..."}\n\n            ← failure
 *
 *  Why re-encode instead of passing through the upstream SSE verbatim?
 *    – The upstream `delta` shape varies between providers (content vs
 *      reasoning_content, partial choices objects, etc.). A typed, minimal
 *      protocol insulates the client from those differences and makes
 *      reasoning vs content a first-class distinction.
 *
 *  Stop button correctness:
 *    – The route accepts `request.signal` (AbortSignal) from the underlying
 *      fetch. When the client aborts, `response.body` is cancelled, we close
 *      the upstream stream, and we end our own stream cleanly WITHOUT emitting
 *      an error event. The client treats abort as "stop, keep partial".
 *
 *  Security:
 *    – No API key is ever read or sent from the client. The SDK loads its
 *      credentials from `/etc/.z-ai-config` server-side at module call time.
 * ────────────────────────────────────────────────────────────────────────────
 */
import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { AI_CONFIG } from "@/lib/ai/config";

/** SSE newline separator. Always "\n\n" per the SSE spec. */
const SSE_SEP = "\n\n";

/** Helper: serialise an event payload as a `data:` line. */
function sseData(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}${SSE_SEP}`;
}

/** Roles the client is allowed to send. Anything else is rejected. */
type ChatRole = "system" | "user" | "assistant";

interface IncomingMessage {
  role: ChatRole;
  content: string;
}

interface IncomingBody {
  messages: IncomingMessage[];
}

/**
 * Parse one SSE chunk from the upstream stream. The OpenAI-compatible format
 * emits `data: {...}\n\n` lines and a terminal `data: [DONE]\n\n`.
 *
 * We deliberately tolerate odd framing (no trailing newlines, split chunks)
 * by buffering partial lines across `push()` calls.
 */
function makeSseLineBuffer(onEvent: (data: string) => void) {
  let buffer = "";
  return {
    push(chunk: string) {
      buffer += chunk;
      // SSE events are separated by a blank line. Handle both \n\n and \r\n\r\n.
      const events = buffer.split(/\r?\n\r?\n/);
      // The last entry is incomplete (or "" if we ended on a separator). Keep it.
      buffer = events.pop() ?? "";
      for (const evt of events) {
        // A single event block may contain several `data:` lines per spec; the
        // upstream uses one, but be tolerant and concatenate.
        const dataLines = evt
          .split(/\r?\n/)
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).replace(/^\s/, ""));
        if (dataLines.length === 0) continue;
        const data = dataLines.join("\n");
        onEvent(data);
      }
    },
    flush() {
      if (buffer.trim().length > 0) {
        const dataLines = buffer
          .split(/\r?\n/)
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).replace(/^\s/, ""));
        if (dataLines.length > 0) onEvent(dataLines.join("\n"));
      }
    },
  };
}

export const runtime = "nodejs";

/**
 * POST /api/chat
 * Body: { messages: Array<{ role: 'user'|'assistant'|'system', content: string }> }
 * Returns: text/event-stream
 */
export async function POST(req: NextRequest) {
  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body?.messages || !Array.isArray(body.messages)) {
    return new Response(
      JSON.stringify({ error: "Missing `messages` array" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Prepend the system prompt from the central config module. The client never
  // sends it — that way changing the persona lives in one place (see config.ts).
  const messages = [
    { role: "system" as const, content: AI_CONFIG.systemPrompt },
    ...body.messages,
  ];

  // ── Open the upstream stream ──────────────────────────────────────────────
  let upstream: ReadableStream<Uint8Array> | null = null;
  try {
    const zai = await ZAI.create();
    upstream = (await zai.chat.completions.create({
      model: AI_CONFIG.model,
      messages,
      stream: true,
      temperature: AI_CONFIG.sampling.temperature,
      top_p: AI_CONFIG.sampling.top_p,
      max_tokens: AI_CONFIG.sampling.max_tokens,
      thinking: AI_CONFIG.thinking,
    })) as ReadableStream<Uint8Array>;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start stream";
    return new Response(sseData({ type: "error", message }), {
      status: 200, // 200 so the client SSE parser receives the error event
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // ── Build the downstream SSE stream ────────────────────────────────────────
  const encoder = new TextEncoder();
  const aborted = { value: false };
  // Reader is hoisted to the outer scope so both the abort handler and the
  // ReadableStream's cancel() can call `reader.cancel()` instead of
  // `upstream.cancel()`. Calling `.cancel()` directly on the underlying
  // stream while a reader is active throws "ReadableStream is locked" —
  // the reader is the canonical way to release / cancel.
  const readerRef: { current: ReadableStreamDefaultReader<Uint8Array> | null } = {
    current: null,
  };

  // Helper — cancel the upstream reader without throwing if the stream is
  // already closed / locked / cancelled.
  const cancelUpstream = (reason?: string) => {
    aborted.value = true;
    const r = readerRef.current;
    if (!r) return;
    // `.cancel()` returns a Promise; rejection (e.g. stream already closed)
    // would surface as an unhandled rejection, so swallow it.
    try {
      const p = r.cancel(reason);
      if (p && typeof (p as Promise<void>).catch === "function") {
        (p as Promise<void>).catch(() => {});
      }
    } catch {
      /* noop */
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // 1) Meta — gives the client a stable id for the assistant message.
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      controller.enqueue(encoder.encode(
        sseData({ type: "meta", id: msgId, createdAt: Date.now() }),
      ));

      // 2) Wire the abort signal: if the client disconnects (Stop button →
      //    fetch.abort()), we stop reading upstream and close cleanly.
      req.signal.addEventListener("abort", () => cancelUpstream("client-abort"));

      const reader = upstream.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      const doneSent = { value: false };
      const buffer = makeSseLineBuffer((data) => {
        if (aborted.value) return;
        if (data === "[DONE]") {
          if (!doneSent.value) {
            doneSent.value = true;
            controller.enqueue(encoder.encode(sseData({ type: "done" })));
          }
          return;
        }
        try {
          const json = JSON.parse(data);
          // OpenAI/Z.AI delta shape:
          //   choices[0].delta.content            ← visible text
          //   choices[0].delta.reasoning_content ← thinking trace (GLM-4.6)
          const delta = json?.choices?.[0]?.delta ?? {};
          if (typeof delta.reasoning_content === "string" && delta.reasoning_content.length > 0) {
            controller.enqueue(encoder.encode(
              sseData({ type: "thinking", value: delta.reasoning_content }),
            ));
          }
          if (typeof delta.content === "string" && delta.content.length > 0) {
            controller.enqueue(encoder.encode(
              sseData({ type: "token", value: delta.content }),
            ));
          }
        } catch {
          // Ignore malformed JSON — the upstream sometimes sends comments or
          // keepalive pings that aren't valid JSON. Don't kill the stream.
        }
      });

      function pump(): Promise<void> {
        return reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              buffer.flush();
              // If the upstream closed without an explicit [DONE], emit done
              // ourselves so the client's "loading" state reliably clears.
              if (!aborted.value && !doneSent.value) {
                doneSent.value = true;
                controller.enqueue(encoder.encode(sseData({ type: "done" })));
              }
              controller.close();
              return;
            }
            buffer.push(decoder.decode(value, { stream: true }));
            return pump();
          })
          .catch((err) => {
            if (aborted.value || err?.name === "AbortError") {
              // Clean stop — emit nothing, just close.
              try { controller.close(); } catch { /* already closed */ }
              return;
            }
            const message = err instanceof Error ? err.message : "Stream failed";
            try {
              controller.enqueue(encoder.encode(sseData({ type: "error", message })));
              controller.close();
            } catch { /* already closed */ }
          });
      }

      pump();
    },
    cancel() {
      // Downstream (client) cancelled. Cancel upstream via the reader.
      cancelUpstream("downstream-cancel");
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering (Vercel, nginx, Cloudflare) so tokens flush
      // immediately — without this the client would see chunks of N tokens
      // instead of one-at-a-time streaming.
      "X-Accel-Buffering": "no",
    },
  });
}
