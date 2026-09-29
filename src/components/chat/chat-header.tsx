/**
 * ChatHeader — top bar. Shows the assistant name, a small "streaming live"
 * status pill, and a Clear button to wipe the conversation (also clears
 * localStorage so refresh gives a clean slate).
 *
 * Layout:
 *  – Mobile: just the assistant avatar + name + clear (no streaming pill, to
 *    save horizontal space on small screens).
 *  – ≥sm: avatar + name + streaming pill on the left, clear button on the right.
 */
"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

interface Props {
  onClear: () => void;
  isStreaming: boolean;
  isThinking: boolean;
  messageCount: number;
  disabled?: boolean;
}

export function ChatHeader({
  onClear,
  isStreaming,
  isThinking,
  messageCount,
  disabled,
}: Props) {
  const prefersReduced = useReducedMotion();
  const live = isStreaming || isThinking;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-[10px] font-bold text-white ring-2 ring-background"
          >
            AI
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
              Streaming Assistant
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              GLM-4.6 · FE-06 streaming chat
            </p>
          </div>
          {live && (
            <span
              className="ml-1 hidden items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex"
              aria-live="polite"
            >
              <motion.span
                className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                animate={prefersReduced ? undefined : { opacity: [1, 0.3, 1] }}
                transition={prefersReduced ? undefined : { duration: 1, repeat: Infinity, ease: "easeInOut" }}
              />
              {isThinking ? "thinking" : "streaming"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled || messageCount === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Clear conversation"
          title="Clear conversation"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </header>
  );
}

// Re-export the RefreshCw icon so consumers don't have to import lucide-react
// directly when they want to wire up a "Regenerate" affordance.
export { RefreshCw };
