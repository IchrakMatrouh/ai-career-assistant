/**
 * ScrollAnchor — renders a "Jump to latest ↓" affordance when the user has
 * scrolled up away from the bottom. Pairs with `useAutoScrollToBottom`.
 *
 * Behaviour:
 *  – When `isPinned` is true (user at bottom), nothing renders.
 *  – When `isPinned` is false (user scrolled up), a floating pill button
 *    appears anchored to the bottom of the scroll viewport. Clicking it
 *    smooth-scrolls back to the latest token and re-pins.
 *  – AnimatePresence handles the fade-in / fade-out so it doesn't pop.
 */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

interface Props {
  isPinned: boolean;
  onJump: () => void;
}

export function ScrollAnchor({ isPinned, onJump }: Props) {
  return (
    <AnimatePresence>
      {!isPinned && (
        <motion.button
          type="button"
          onClick={onJump}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          aria-label="Jump to latest message"
          className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-lg shadow-black/5 transition-colors hover:bg-muted"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          <span>Jump to latest</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
