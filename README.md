# FE-06 — Streaming AI Chat Interface

A token-by-token streaming AI chat built with **Next.js 16 App Router**, a
**custom SSE consumer** (no `@ai-sdk/react` dependency), and **GLM-4.6** via
`z-ai-web-dev-sdk`. Designed against the FE-06 evaluation criteria:

- ✅ Responses visibly stream token by token
- ✅ Generation can be stopped mid-stream without breaking state (partial
  message is preserved; "stop, then send again" works)
- ✅ Conversation state survives multiple turns
- ✅ API key lives server-side only (the Z.AI SDK reads credentials from
  `/etc/.z-ai-config`; the client never sees the key)
- ✅ Usable at phone width (375×812 verified)
- ✅ Auto-scroll respects user scrolling up + offers a "Jump to latest"
  affordance that works mid-stream
- ✅ Streaming-aware markdown renderer (handles unclosed code fences)
- ✅ Conversation persists to localStorage (refresh mid-conversation is
  not a data-loss event)

## Preview URL

The app is deployed in the sandbox at:

```
https://preview-35e522eb-677d-4764-8b7b-1c9b93febdc8.space-z.ai/
```

## Files to review

### Route handler (server-side)
**[`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)**

POST handler that calls `zai.chat.completions.create({ stream: true })`
and re-emits the upstream SSE as a typed minimal protocol:

```
data: {"type":"meta","id":"msg_...","createdAt":...}
data: {"type":"thinking","value":"..."}     ← reasoning trace (GLM-4.6)
data: {"type":"token","value":"..."}        ← visible tokens
data: {"type":"done"}                       ← clean end
data: {"type":"error","message":"..."}      ← failure
```

Honors `request.signal` so the Stop button aborts the upstream fetch
without an unhandled rejection.

### Chat component (client-side)
- **[`src/components/chat/chat-container.tsx`](src/components/chat/chat-container.tsx)** — orchestrator
- **[`src/components/chat/chat-message.tsx`](src/components/chat/chat-message.tsx)** — distinct user/assistant bubbles
- **[`src/components/chat/chat-input.tsx`](src/components/chat/chat-input.tsx)** — textarea + 5-state Send/Stop button
- **[`src/components/chat/thinking-indicator.tsx`](src/components/chat/thinking-indicator.tsx)** — the "model is thinking" affordance
- **[`src/components/chat/scroll-anchor.tsx`](src/components/chat/scroll-anchor.tsx)** — "Jump to latest" pill

### Custom SSE consumer
**[`src/hooks/use-chat.ts`](src/hooks/use-chat.ts)** — the state machine.
Reads the SSE stream via `fetch().body.getReader()`, maintains typed
message parts (`thinking` | `text` | `error`), implements `stop()` via
`AbortController.abort()` (preserves the partial message), and persists
the conversation to localStorage (debounced 200ms).

**[`src/hooks/use-auto-scroll.ts`](src/hooks/use-auto-scroll.ts)** —
the pin/jump-to-latest logic. Uses a passive scroll listener +
ResizeObserver. Threshold = 80px so token-by-token height changes don't
oscillate the pin.

### Central model config (single well-commented module)
**[`src/lib/ai/config.ts`](src/lib/ai/config.ts)** — model id, sampling
params, thinking toggle, and system prompt all live here. FE-07 will
extend this module.

### Streaming-aware markdown renderer
**[`src/lib/ai/streaming-markdown.tsx`](src/lib/ai/streaming-markdown.tsx)**
— wraps `react-markdown` + `remark-gfm`. Normalizes unclosed code fences
by appending a synthetic closer before parsing, so half-streamed markdown
doesn't visually break mid-stream.

## How to verify each evaluation criterion

| Criterion | How to test |
|-----------|-------------|
| **Tokens stream** | Click "Stream a haiku" — you'll see words arrive one at a time |
| **Stop works mid-stream** | Click "Count slowly", press Stop before it finishes. The partial message is kept, "STOPPED" tag appears, input re-enables. Send another message immediately — it works |
| **Multi-turn state survives** | Send 3+ messages in sequence; each turn uses the prior conversation as context |
| **API key server-side only** | Open DevTools → Network → click the `POST /api/chat` request → no API key in the request payload or headers. The Z.AI SDK reads its key from `/etc/.z-ai-config` server-side |
| **Phone width** | Open DevTools → toggle device toolbar → set 375×812. The textarea is 44px tall (touch target), input is sticky above the soft keyboard, all controls are reachable |
| **Auto-scroll respects scroll-up** | Send a long message (e.g. "5-paragraph essay"), scroll up while tokens are streaming. The view stays where you are. A "Jump to latest" pill appears at the bottom — click it to re-pin |
| **Persistence** | Send a message, refresh the page — the conversation rehydrates from localStorage |

## Stretch goals implemented

- **Motion pass** — message entrance animations, indicator→token handoff
  in the same bubble (no flicker), Send→Stop button morphs via
  `framer-motion`'s `layout` prop. `prefers-reduced-motion` is honoured
  everywhere (`useReducedMotion()`).
- **localStorage persistence** — debounced 200ms writes; key is
  `fe06:chat:v1`. Refresh mid-conversation is lossless.

## Tech notes

- **Why a custom SSE consumer instead of `useChat` from `@ai-sdk/react`?**
  The Z.AI SDK streams a raw OpenAI-compatible SSE response, not the
  AI-SDK data-stream protocol. Writing a 120-line purpose-fit hook is
  simpler than installing the AI SDK + writing a compatibility shim,
  and gives full control over the Stop button semantics — which is the
  assignment's #1 robustness bar.
- **Why re-encode the upstream SSE?** The upstream `delta` shape varies
  between providers (`content` vs `reasoning_content`, partial choices
  objects). A typed minimal protocol insulates the client and makes
  reasoning vs content a first-class distinction.
- **`X-Accel-Buffering: no`** is set on the response so proxy buffering
  (nginx, Cloudflare) doesn't batch tokens — without it the client would
  see chunks of N tokens instead of one-at-a-time streaming.

## Tech stack

- Next.js 16 (App Router, runtime = nodejs)
- TypeScript 5, Tailwind CSS 4, shadcn/ui
- `z-ai-web-dev-sdk` for the LLM call (server-side only)
- `react-markdown` + `remark-gfm` for the streaming-aware renderer
- `framer-motion` for the motion pass + reduced-motion support

## Local development

```bash
bun install
bun run dev    # http://localhost:3000
bun run lint   # ESLint — must pass
```

The Z.AI SDK reads its config from `/etc/.z-ai-config` — no env vars to
set on the client or the server.
