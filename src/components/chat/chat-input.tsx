/**
 * ChatInput — textarea + the 5-state send/stop button.
 *
 * The assignment says: "Connects to Motion with Intent (W5 session) and the
 * Buttons with a Brain assignment — your send/stop button is a perfect
 * candidate for that assignment's five-state treatment."
 *
 * Five states (matching the Buttons-with-a-Brain framework):
 *   1. idle       — input empty; send button is muted, disabled
 *   2. ready      — input non-empty, no stream; send button is primary
 *   3. loading    — waiting for first token; button morphs to Stop, shows
 *                   "Stop" + a pulsing indicator
 *   4. streaming  — tokens flowing in; button still Stop, slightly muted
 *                   so it's visually distinct from "loading"
 *   5. error      — last turn failed; button shows a brief Retry affordance
 *                   (and a tooltip explaining what failed)
 *
 * The morph from Send → Stop is a layout animation (framer-motion), not a
 * swap — that way the button never disappears and the user's thumb never
 * misses it on mobile.
 *
 * Mobile friendliness:
 *  – Textarea min-height 44px (touch target). Min 44px tap target on the button.
 *  – Enter to send, Shift+Enter for newline (the standard mobile/desktop
 *    chat convention).
 *  – The whole bar is sticky to the bottom of the viewport so the textarea
 *    stays anchored to the soft keyboard on mobile.
 *  – Honours prefers-reduced-motion — layout crossfades become instant swaps.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Loader2, Square, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatStatus } from "@/hooks/use-chat";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRetry?: () => void;
  status: ChatStatus;
  /** True when at least one token has streamed in the current turn. */
  isStreaming: boolean;
  /** True when waiting for the first token of the current turn. */
  isThinking: boolean;
  /** Last error message, surfaced in the error state. */
  error: string | null;
  disabled?: boolean;
}

type ButtonState = "idle" | "ready" | "loading" | "streaming" | "error";

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  onRetry,
  status,
  isStreaming,
  isThinking,
  error,
  disabled,
}: Props) {
  const prefersReduced = useReducedMotion();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Autosize the textarea up to ~6 lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${next}px`;
  }, [value]);

  // Compute the button state.
  const buttonState: ButtonState =
    status === "error"
      ? "error"
      : status === "loading"
        ? isStreaming
          ? "streaming"
          : "loading"
        : value.trim().length > 0
          ? "ready"
          : "idle";

  // Send / Stop dispatcher.
  const handleAction = () => {
    if (buttonState === "loading" || buttonState === "streaming") {
      onStop();
      return;
    }
    if (buttonState === "error") {
      onRetry?.();
      return;
    }
    if (buttonState === "ready") {
      onSend();
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (buttonState === "ready") onSend();
    }
  };

  // Label + icon per state.
  const buttonContent: Record<
    ButtonState,
    { icon: React.ReactNode; label: string; ariaLabel: string }
  > = {
    idle: { icon: <ArrowUp className="h-4 w-4" />, label: "Send", ariaLabel: "Send message (disabled — input is empty)" },
    ready: { icon: <ArrowUp className="h-4 w-4" />, label: "Send", ariaLabel: "Send message" },
    loading: { icon: <Square className="h-3.5 w-3.5 fill-current" />, label: "Stop", ariaLabel: "Stop generating" },
    streaming: { icon: <Square className="h-3.5 w-3.5 fill-current" />, label: "Stop", ariaLabel: "Stop generating" },
    error: { icon: <AlertCircle className="h-4 w-4" />, label: "Retry", ariaLabel: "Retry last message" },
  };

  const active = buttonState;
  const isActionable = active !== "idle";
  const isStopVariant = active === "loading" || active === "streaming";

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-md">
      {/* Error banner — above the textarea, only when error state is active. */}
      {active === "error" && error && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Last request failed: {error}</span>
        </div>
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-3">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message the assistant…  (Enter to send, Shift+Enter for newline)"
            aria-label="Message input"
            className="max-h-40 min-h-[44px] w-full resize-none rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 pr-3 text-[0.9375rem] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || status === "loading"}
          />
        </div>

        <motion.button
          type="button"
          onClick={handleAction}
          disabled={!isActionable}
          aria-label={buttonContent[active].ariaLabel}
          title={buttonContent[active].ariaLabel}
          layout={prefersReduced ? false : true}
          layoutId="send-stop-button"
          transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 28 }}
          className={cn(
            "inline-flex h-11 min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-2xl px-3 text-sm font-semibold transition-colors",
            isStopVariant
              ? "bg-foreground text-background hover:bg-foreground/90"
              : active === "error"
                ? "border border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : active === "ready"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground",
            !isActionable && "cursor-not-allowed opacity-50",
          )}
        >
          {active === "loading" && !prefersReduced ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            buttonContent[active].icon
          )}
          <span className="hidden sm:inline">{buttonContent[active].label}</span>
        </motion.button>
      </div>
    </div>
  );
}
