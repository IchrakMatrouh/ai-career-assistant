# FE-06 Submission Cover Sheet

**Assignment:** FE-06 — Streaming AI Chat Interface
**Track:** Frontend AI Engineering · Week 4 · Build phase

## Live preview

The reviewer can hold a streaming conversation here:

```
https://preview-35e522eb-677d-4764-8b7b-1c9b93febdc8.space-z.ai/
```

If the sandbox URL has rotated, deploy this folder to Vercel (`bun install && bun run dev` locally, or connect the GitHub repo to Vercel for auto-deploy).

## Required deliverables (per the brief)

### 1. Route handler (server-side)

**`src/app/api/chat/route.ts`**

A POST handler that calls GLM-4.6 via `z-ai-web-dev-sdk` with `stream: true`
and re-emits the upstream SSE as a typed minimal protocol:

```
data: {"type":"meta","id":"msg_...","createdAt":...}
data: {"type":"thinking","value":"..."}     ← reasoning trace
data: {"type":"token","value":"..."}        ← visible tokens
data: {"type":"done"}                       ← clean end
data: {"type":"error","message":"..."}      ← failure
```

Honors `request.signal` so the Stop button aborts the upstream fetch cleanly.
Sets `X-Accel-Buffering: no` so tokens flush immediately through proxies.
**API key lives server-side only** — the SDK reads credentials from
`/etc/.z-ai-config`; the client never sees the key.

### 2. Chat component (client-side)

**`src/components/chat/chat-container.tsx`**

Orchestrator that wires together:
- `useChat()` (custom SSE consumer)
- `useAutoScrollToBottom()` (pin/jump-to-latest)
- Header, message list, input bar, scroll anchor, empty state

Sibling files in the same folder:
| File | Role |
|------|------|
| `chat-message.tsx` | Distinct user/assistant bubbles + reasoning disclosure |
| `chat-input.tsx` | 5-state Send/Stop button (framer-motion layout morph) |
| `thinking-indicator.tsx` | 3-dot pulse, prefers-reduced-motion respected |
| `scroll-anchor.tsx` | "Jump to latest" pill |
| `empty-state.tsx` | 4 one-click suggested prompts |
| `chat-header.tsx` | Top bar with Clear + streaming pill |

## How to verify each evaluation criterion

| Criterion | How to test |
|-----------|------------|
| Responses visibly stream token by token | Click "Stream a haiku" — words arrive one at a time |
| Stop works mid-stream | Click "Count slowly", press Stop before it finishes. Partial message persists with a "STOPPED" tag, input re-enables. Send another message — it works. |
| Conversation state survives multiple turns | Send 3+ messages; each turn uses prior context |
| API key lives server-side only | DevTools → Network → `POST /api/chat` — no API key in request payload or headers |
| Usable at phone width | DevTools → 375×812. 44px touch targets, sticky input, all controls reachable. See `screenshots/fe06-mobile.png`. |

## Additional files worth reviewing

- **`src/hooks/use-chat.ts`** — the custom SSE consumer. Typed message parts (`thinking` | `text` | `error`), `stop()` via `AbortController.abort()` (preserves partial message + tags it "stopped"), localStorage persistence (debounced 200ms, SSR-safe hydration).
- **`src/hooks/use-auto-scroll.ts`** — pin/jump-to-latest logic. Passive scroll listener + ResizeObserver. 80px threshold so token-by-token height changes don't oscillate the pin.
- **`src/lib/ai/config.ts`** — the SINGLE well-commented module for model id, sampling params, thinking toggle, and system prompt. FE-07 will extend this.
- **`src/lib/ai/streaming-markdown.tsx`** — react-markdown + remark-gfm wrapper that normalizes unclosed code fences before parsing, so half-streamed markdown doesn't visually break mid-stream.

## Stretch goals implemented

- **Motion pass** — message entrance animations, indicator→token handoff in the same bubble (no flicker — the bubble exists before the first token), Send→Stop button morphs via framer-motion's `layout` prop. `prefers-reduced-motion` honored everywhere via `useReducedMotion()`.
- **localStorage persistence** — conversation rehydrates across refresh. Key: `fe06:chat:v1`. Debounced 200ms writes.

## Tech stack

- Next.js 16 (App Router, runtime = nodejs)
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- `z-ai-web-dev-sdk` for the LLM call (server-side only)
- `react-markdown` + `remark-gfm` for the streaming-aware renderer
- `framer-motion` for the motion pass

## Run locally

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint     # ESLint — passes clean
```

The Z.AI SDK reads its config from `/etc/.z-ai-config` — no env vars to set
on the client. The included `.env` only contains `DATABASE_URL` for Prisma
(not used by the chat feature, but kept so the project still bootstraps).

## Screenshots

| File | What it shows |
|------|----------------|
| `screenshots/fe06-empty-state.png` | Initial state with 4 suggested prompts |
| `screenshots/fe06-streaming.png` | Mid-stream — tokens arriving one at a time |
| `screenshots/fe06-mobile.png` | 375×812 viewport — mobile layout |
| `screenshots/fe06-desktop.png` | Desktop layout with a turn completed |
