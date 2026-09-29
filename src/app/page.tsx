import { ChatContainer } from "@/components/chat/chat-container";

/**
 * FE-06 — Streaming AI Chat Interface
 *
 * The single user-visible route. Everything is wired inside <ChatContainer/>:
 *   – Server route: /api/chat (calls GLM-4.6 via z-ai-web-dev-sdk with stream:true)
 *   – Client consumer: src/hooks/use-chat.ts (custom SSE consumer)
 *   – Central config: src/lib/ai/config.ts (model + system prompt — single module)
 *   – Streaming-aware markdown: src/lib/ai/streaming-markdown.tsx
 *
 * The page intentionally has no chrome of its own — the chat occupies the
 * full viewport, mobile-first.
 */
export default function Home() {
  return <ChatContainer />;
}
