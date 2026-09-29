/**
 * ────────────────────────────────────────────────────────────────────────────
 *  useChat() — custom SSE consumer for FE-06 streaming chat
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Why a custom hook instead of `@ai-sdk/react`'s `useChat`?
 *    – The Z.AI SDK streams a raw OpenAI-compatible SSE response. The AI SDK's
 *      `useChat` expects the proprietary AI-SDK data-stream protocol; wiring it
 *      would require either installing the AI SDK or writing a compatibility
 *      shim. Building a 120-line purpose-fit hook is simpler, has zero
 *      dependencies, and gives us full control over the Stop button semantics
 *      (which is the assignment's #1 robustness bar).
 *
 *  State shape:
 *    messages: Message[]
 *      – User messages:     { id, role: 'user',      parts: [{type:'text', text}] }
 *      – Assistant messages: { id, role: 'assistant', parts: Part[] }
 *          where Part = ThinkingPart | TextPart | ErrorPart
 *          { type: 'thinking', text }  ← reasoning trace (collapsible)
 *          { type: 'text',     text }  ← visible content
 *          { type: 'error',    text }  ← server error surfaced inline
 *
 *  Stop semantics (the assignment explicitly tests "stop, then send again"):
 *    – `stop()` calls `AbortController.abort()`. The in-flight fetch is
 *      cancelled, the partial assistant message is KEPT (whatever tokens
 *      arrived are preserved), `status` returns to 'ready', and `input` is
 *      re-enabled. The very next `sendMessage()` works as if nothing had
 *      happened — no dangling state.
 *
 *  Persistence (stretch goal):
 *    – Conversation state is mirrored to localStorage after every change,
 *      debounced 200ms. On mount, the hook hydrates from localStorage so a
 *      refresh mid-conversation isn't a data-loss event. The persistence key
 *      is namespaced to this assignment to avoid collisions.
 *
 *  Thinking → first token handoff (mentor tip):
 *    – We never "blank" the thinking indicator before the first text token.
 *      While `status === 'loading'` AND the assistant message has zero
 *      `text` parts, the UI renders the ThinkingIndicator OVERLAID on the
 *      same bubble the first token will land in. As soon as a `token` event
 *      arrives, the indicator's animation runs one final 240ms pass and fades
 *      out while the first token fades in — see <ThinkingIndicator/> for the
 *      choreography.
 * ────────────────────────────────────────────────────────────────────────────
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export type ThinkingPart = { type: "thinking"; text: string };
export type TextPart = { type: "text"; text: string };
export type ErrorPart = { type: "error"; text: string };
export type MessagePart = ThinkingPart | TextPart | ErrorPart;

export interface Message {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  /** ISO string — set when the message is created. */
  createdAt: string;
  /** True if this assistant message was stopped mid-stream (Stop button). */
  stopped?: boolean;
}

export type ChatStatus = "idle" | "loading" | "ready" | "error";

// ── SSE wire format (mirrors `src/app/api/chat/route.ts`) ─────────────────────

type SseEvent =
  | { type: "meta"; id: string; createdAt: number }
  | { type: "thinking"; value: string }
  | { type: "token"; value: string }
  | { type: "done" }
  | { type: "error"; message: string };

// ── Persistence ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "fe06:chat:v1";

function loadFromStorage(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape check — don't trust stored data blindly.
    return parsed.filter(
      (m): m is Message =>
        m &&
        typeof m.id === "string" &&
        (m.role === "user" || m.role === "assistant") &&
        Array.isArray(m.parts),
    );
  } catch {
    return [];
  }
}

function saveToStorage(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Quota exceeded / disabled — silently ignore; persistence is a stretch goal.
  }
}

// ── ID helper ─────────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface UseChatOptions {
  /** Endpoint that returns the SSE stream. Defaults to '/api/chat'. */
  api?: string;
  /** When true, persist conversation to localStorage (default: true). */
  persist?: boolean;
}

export interface UseChatReturn {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  status: ChatStatus;
  /** True only when waiting for the FIRST token of an assistant turn. */
  isThinking: boolean;
  /** True when at least one token has streamed but the stream is still open. */
  isStreaming: boolean;
  /** The id of the assistant message currently being streamed, or null. */
  streamingMessageId: string | null;
  sendMessage: (text?: string) => void;
  stop: () => void;
  regenerate: () => void;
  clear: () => void;
  /** Most recent error message surfaced from the server (also mirrored into the message). */
  error: string | null;
}

export function useChat(opts: UseChatOptions = {}): UseChatReturn {
  const { api = "/api/chat", persist = true } = opts;

  // ── State ────────────────────────────────────────────────────────────────
  // We deliberately initialise to [] / "idle" so the FIRST client render
  // matches the server render (which can't read localStorage). The persisted
  // conversation is hydrated in a useEffect below — that's the canonical
  // "sync with an external store" use case for useEffect per
  // https://react.dev/learn/you-might-not-need-an-effect, and the documented
  // exception to the set-state-in-effect rule.
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // The AbortController for the in-flight request, kept in a ref so it doesn't
  // trigger re-renders.
  const abortRef = useRef<AbortController | null>(null);

  // The id of the assistant message currently being streamed — used by the
  // UI to know which bubble to attach the ThinkingIndicator / cursor to.
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Has at least one visible text token arrived for the current assistant turn?
  const [hasFirstToken, setHasFirstToken] = useState(false);

  // ── Hydrate from localStorage AFTER mount ──────────────────────────────
  // localStorage is an external store only available client-side, so we
  // read it in useEffect (the canonical pattern per
  // https://react.dev/learn/you-might-not-need-an-effect). The first client
  // render matches the server (empty messages), so no hydration mismatch.
  useEffect(() => {
    if (!persist) return;
    const stored = loadFromStorage();
    if (stored.length === 0) return;
    // setState in effect is the documented exception here — hydrating from
    // an external store that's only available client-side. The lint rule
    // fires on the FIRST setMessages call and is silenced there; the second
    // setStatus call doesn't need a disable because the rule only fires
    // once per effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(stored);
    setStatus("ready");
  }, [persist]);

  // ── Persist on change (debounced 200ms) ──────────────────────────────────
  useEffect(() => {
    if (!persist) return;
    const t = setTimeout(() => saveToStorage(messages), 200);
    return () => clearTimeout(t);
  }, [messages, persist]);

  // ── Tear down on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Derived flags ──────────────────────────────────────────────────────────────
  const isThinking = status === "loading" && !hasFirstToken;
  const isStreaming = status === "loading" && hasFirstToken;

  // ── Core: send a message ─────────────────────────────────────────────────
  const sendMessage = useCallback(
    (text?: string) => {
      const content = (text ?? input).trim();
      if (!content) return;
      if (status === "loading") return; // guard: don't double-send

      const now = new Date().toISOString();
      const userMsg: Message = {
        id: genId("u"),
        role: "user",
        parts: [{ type: "text", text: content }],
        createdAt: now,
      };
      // The assistant placeholder is created up-front so the UI can render
      // the thinking indicator in the right bubble immediately. Parts are
      // filled in as events arrive.
      const assistantId = genId("a");
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        parts: [],
        createdAt: new Date().toISOString(),
      };

      // Reset streaming-tracking state for this turn.
      setHasFirstToken(false);
      setStreamingMessageId(assistantId);
      setError(null);

      // Build the conversation history to send to the server. We include the
      // previous messages (without their thinking parts — those are UI-only)
      // and the new user message.
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as TextPart).text)
          .join(""),
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setStatus("loading");

      const controller = new AbortController();
      abortRef.current = controller;

      // ── SSE reader ──────────────────────────────────────────────────────────
      // We use fetch + getReader() rather than EventSource because EventSource
      // doesn't support POST bodies, doesn't support AbortController cleanly,
      // and can't send arbitrary headers. The custom reader is ~40 lines.
      (async () => {
        let response: Response;
        try {
          response = await fetch(api, {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: history }),
          });
        } catch (err: unknown) {
          // AbortError = user pressed Stop — clean exit, keep partial message.
          if ((err as Error)?.name === "AbortError") {
            setStatus("ready");
            setStreamingMessageId(null);
            abortRef.current = null;
            return;
          }
          const message = err instanceof Error ? err.message : "Network error";
          setError(message);
          setStatus("error");
          setStreamingMessageId(null);
          abortRef.current = null;
          // Surface the error inline so the user knows why the bubble is empty.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, parts: [...m.parts, { type: "error", text: message }] }
                : m,
            ),
          );
          return;
        }

        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => "");
          const message = text || `Request failed (${response.status})`;
          setError(message);
          setStatus("error");
          setStreamingMessageId(null);
          abortRef.current = null;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, parts: [...m.parts, { type: "error", text: message }] }
                : m,
            ),
          );
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleEvent = (raw: string) => {
          if (!raw.startsWith("data:")) return;
          const data = raw.slice(5).trim();
          if (!data) return;
          let evt: SseEvent;
          try {
            evt = JSON.parse(data) as SseEvent;
          } catch {
            return;
          }
          switch (evt.type) {
            case "token":
              setHasFirstToken(true);
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const lastPart = m.parts[m.parts.length - 1];
                  if (lastPart && lastPart.type === "text") {
                    const parts = m.parts.slice();
                    parts[parts.length - 1] = {
                      ...lastPart,
                      text: lastPart.text + evt.value,
                    };
                    return { ...m, parts };
                  }
                  return {
                    ...m,
                    parts: [...m.parts, { type: "text", text: evt.value }],
                  };
                }),
              );
              break;
            case "thinking":
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const lastPart = m.parts[m.parts.length - 1];
                  if (lastPart && lastPart.type === "thinking") {
                    const parts = m.parts.slice();
                    parts[parts.length - 1] = {
                      ...lastPart,
                      text: lastPart.text + evt.value,
                    };
                    return { ...m, parts };
                  }
                  return {
                    ...m,
                    parts: [
                      ...m.parts,
                      { type: "thinking", text: evt.value },
                    ],
                  };
                }),
              );
              break;
            case "done":
              setStatus("ready");
              setStreamingMessageId(null);
              setHasFirstToken(false);
              abortRef.current = null;
              break;
            case "error":
              setStatus("error");
              setError(evt.message);
              setStreamingMessageId(null);
              abortRef.current = null;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, parts: [...m.parts, { type: "error", text: evt.message }] }
                    : m,
                ),
              );
              break;
            case "meta":
              // We could swap our placeholder id for the server-assigned id,
              // but keeping our own avoids a re-render race. The meta event is
              // primarily for confirmation that the stream has opened.
              break;
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // SSE events are separated by blank lines.
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() ?? "";
            for (const evt of events) handleEvent(evt);
          }
          // Flush any trailing event.
          if (buffer.trim()) handleEvent(buffer);
          // If the stream ended without an explicit `done` event, mark ready
          // anyway — don't leave the UI stuck in "loading".
          setStatus((prev) => (prev === "loading" ? "ready" : prev));
          setStreamingMessageId(null);
          abortRef.current = null;
        } catch (err: unknown) {
          if ((err as Error)?.name === "AbortError") {
            // User pressed stop. Keep the partial message, mark as ready.
            setStatus("ready");
            setStreamingMessageId(null);
            setHasFirstToken(false);
            abortRef.current = null;
            // Tag the assistant message as stopped so the UI can render a
            // subtle "[stopped]" affordance.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, stopped: true } : m,
              ),
            );
            return;
          }
          const message = err instanceof Error ? err.message : "Stream error";
          setStatus("error");
          setError(message);
          setStreamingMessageId(null);
          abortRef.current = null;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, parts: [...m.parts, { type: "error", text: message }] }
                : m,
            ),
          );
        }
      })();
    },
    [api, input, messages, status],
  );

  // ── Stop ─────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (abortRef.current) {
      // .abort() will trigger the AbortError branch in sendMessage's reader,
      // which will mark status='ready' and tag the message as stopped. We
      // don't need to do anything else here.
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // ── Regenerate ───────────────────────────────────────────────────────────
  // Pops the last assistant message and re-sends the user's last prompt.
  const regenerate = useCallback(() => {
    if (status === "loading") return;
    if (messages.length < 2) return;
    // Walk back to the last user message.
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[lastUserIdx];
    const text = lastUserMsg.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as TextPart).text)
      .join("");
    if (!text) return;
    // Drop everything from the last user message onward, then re-send.
    setMessages((prev) => prev.slice(0, lastUserIdx));
    // Use a microtask so state updates flush before sendMessage reads messages.
    queueMicrotask(() => {
      // Send directly with the text, bypassing the input field.
      sendMessage(text);
    });
  }, [messages, status, sendMessage]);

  // ── Clear ────────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInput("");
    setStatus("idle");
    setError(null);
    setStreamingMessageId(null);
    setHasFirstToken(false);
    if (persist && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [persist]);

  return useMemo(
    () => ({
      messages,
      input,
      setInput,
      status,
      isThinking,
      isStreaming,
      streamingMessageId,
      sendMessage,
      stop,
      regenerate,
      clear,
      error,
    }),
    [
      messages,
      input,
      status,
      isThinking,
      isStreaming,
      streamingMessageId,
      sendMessage,
      stop,
      regenerate,
      clear,
      error,
    ],
  );
}
