/**
 * ChatContainer — the orchestrator. Wires:
 *   – useChat() hook (state machine + SSE consumer)
 *   – useAutoScrollToBottom() (pin / jump-to-latest)
 *   – <ChatHeader/>, <EmptyState/>, <ChatMessage/> list, <ScrollAnchor/>,
 *     <ChatInput/>
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ <ChatHeader/>                       (sticky top)     │
 *   │ ┌─────────────────────────────────────────────────┐  │
 *   │ │ scrollRef (overflow-y-auto)                     │  │
 *   │ │   └ contentRef                                   │  │
 *   │ │       messages map → <ChatMessage/>              │  │
 *   │ │       <ScrollAnchor/> floating at bottom          │  │
 *   │ └─────────────────────────────────────────────────┘  │
 *   │ <ChatInput/>                 (sticky bottom)          │
 *   └─────────────────────────────────────────────────────┘
 *
 * The outer wrapper is min-h-screen flex flex-col so the chat input sticks
 * to the bottom of the viewport on mobile, and the scroll area expands to
 * fill the remaining space. The footer is naturally pushed down by the
 * message list when content overflows (per the layout rule in the system
 * prompt — but this app has no footer, so the input bar IS the bottom of the
 * viewport).
 */
"use client";

import { useRef } from "react";
import { useChat } from "@/hooks/use-chat";
import { useAutoScrollToBottom } from "@/hooks/use-auto-scroll";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { EmptyState } from "./empty-state";
import { ScrollAnchor } from "./scroll-anchor";

export function ChatContainer() {
  const chat = useChat({ api: "/api/chat", persist: true });
  const { scrollRef, contentRef, isPinned, jumpToBottom } =
    useAutoScrollToBottom<HTMLDivElement>();

  // Track whether the current streaming message has its first token yet.
  // We compute this from `chat.messages` + `chat.streamingMessageId` +
  // `chat.isThinking` so the <ChatMessage/> component can decide whether to
  // render the indicator or the streaming markdown.
  const streamingMsgId = chat.streamingMessageId;
  const streamingMsg = streamingMsgId
    ? chat.messages.find((m) => m.id === streamingMsgId)
    : undefined;
  const streamingHasText =
    !!streamingMsg?.parts.some((p) => p.type === "text");

  const isEmpty = chat.messages.length === 0;

  // Track the scroll container's height to absolutely-position the
  // ScrollAnchor pill at its bottom.
  const scrollWrapperRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col bg-background">
      <ChatHeader
        onClear={chat.clear}
        isStreaming={chat.isStreaming}
        isThinking={chat.isThinking}
        messageCount={chat.messages.length}
      />

      {/* Scroll area — fills remaining vertical space. */}
      <div
        ref={scrollWrapperRef}
        className="relative flex-1 overflow-hidden"
      >
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain scroll-smooth"
          aria-live="polite"
          role="log"
          aria-label="Conversation"
        >
          <div
            ref={contentRef}
            className="mx-auto flex min-h-full max-w-3xl flex-col gap-3 px-3 py-4 sm:px-4 sm:py-6"
          >
            {isEmpty ? (
              <EmptyState onPick={(prompt) => chat.sendMessage(prompt)} />
            ) : (
              chat.messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  isStreaming={m.id === streamingMsgId}
                  isWaitingForFirstToken={
                    m.id === streamingMsgId &&
                    chat.isThinking &&
                    !streamingHasText
                  }
                />
              ))
            )}
            {/* Bottom spacer so the last message can scroll above the input
                bar on mobile (avoids being hidden behind it). */}
            <div className="h-2 shrink-0" aria-hidden="true" />
          </div>
        </div>

        {/* Floating "jump to latest" pill — anchored to the bottom of the
            scroll wrapper, above the input bar. */}
        <ScrollAnchor isPinned={isPinned} onJump={jumpToBottom} />
      </div>

      <ChatInput
        value={chat.input}
        onChange={chat.setInput}
        onSend={() => chat.sendMessage()}
        onStop={chat.stop}
        onRetry={chat.regenerate}
        status={chat.status}
        isStreaming={chat.isStreaming}
        isThinking={chat.isThinking}
        error={chat.error}
      />
    </div>
  );
}
