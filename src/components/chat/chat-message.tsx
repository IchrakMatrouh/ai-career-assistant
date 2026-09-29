/**
 * ChatMessage — one bubble. Distinct user vs assistant styling.
 *
 * Layout:
 *  – User: right-aligned, solid primary background, primary-foreground text,
 *    no avatar, rounded bubble (tail on the bottom-right).
 *  – Assistant: left-aligned, soft muted background, small circular avatar
 *    (gradient ring), rounded bubble (tail on the bottom-left).
 *
 * Streaming:
 *  – If this is the streaming message AND has no text parts yet, render the
 *    ThinkingIndicator INSIDE the bubble (so the bubble exists before the
 *    first token — no flicker on first token).
 *  – Once a text part exists, render StreamingMarkdown with a blinking cursor
 *    while streaming.
 *
 * Thinking parts (reasoning_content from GLM-4.6) render as a collapsible
 * disclosure above the answer; collapsed by default to keep the bubble tidy.
 */
"use client";

import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronRight, AlertTriangle, Square } from "lucide-react";
import { StreamingMarkdown } from "@/lib/ai/streaming-markdown";
import { ThinkingIndicator } from "./thinking-indicator";
import type { Message } from "@/hooks/use-chat";

interface Props {
  message: Message;
  /** Is this message currently being streamed into? */
  isStreaming: boolean;
  /** Are we waiting for the FIRST token on this message? */
  isWaitingForFirstToken: boolean;
}

export function ChatMessage({ message, isStreaming, isWaitingForFirstToken }: Props) {
  const isUser = message.role === "user";
  const [thinkingOpen, setThinkingOpen] = useState(false);

  const textParts = message.parts.filter((p) => p.type === "text");
  const thinkingParts = message.parts.filter((p) => p.type === "thinking");
  const errorParts = message.parts.filter((p) => p.type === "error");

  const hasText = textParts.length > 0;
  const visibleText = textParts.map((p) => (p as { text: string }).text).join("");
  const thinkingText = thinkingParts.map((p) => (p as { text: string }).text).join("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[88%] items-start gap-2 sm:max-w-[78%] ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar — assistant only. User messages stay clean. */}
        {!isUser && (
          <div
            aria-hidden="true"
            className="mt-0.5 hidden h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 ring-2 ring-background sm:flex sm:items-center sm:justify-center"
          >
            <span className="text-[10px] font-bold text-white">AI</span>
          </div>
        )}

        <div
          className={`relative min-w-0 rounded-2xl px-3.5 py-2.5 text-[0.9375rem] sm:px-4 sm:py-3 ${
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-card text-card-foreground shadow-sm"
          }`}
        >
          {/* Reasoning trace — collapsible. */}
          {!isUser && thinkingText && (
            <div className="mb-2 border-b border-border/60 pb-2">
              <button
                type="button"
                onClick={() => setThinkingOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                aria-expanded={thinkingOpen}
              >
                <Brain className="h-3.5 w-3.5" />
                <span>Reasoning</span>
                <motion.span animate={{ rotate: thinkingOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {thinkingOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="mt-1.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                      {thinkingText}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Either thinking indicator (no tokens yet) or the streaming markdown. */}
          {!isUser && isWaitingForFirstToken && !hasText ? (
            <ThinkingIndicator />
          ) : isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{visibleText}</p>
          ) : (
            <StreamingMarkdown
              content={visibleText}
              streamingCursor={isStreaming && !message.stopped}
            />
          )}

          {/* Inline errors — show after partial content. */}
          {!isUser && errorParts.length > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-words">
                {errorParts.map((p) => (p as { text: string }).text).join("; ")}
              </span>
            </div>
          )}

          {/* Stopped affordance — subtle, only on assistant-stopped bubbles. */}
          {!isUser && message.stopped && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
              <Square className="h-2.5 w-2.5 fill-current" />
              <span>stopped</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
