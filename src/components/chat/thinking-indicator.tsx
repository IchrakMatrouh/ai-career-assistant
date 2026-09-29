/**
 * ThinkingIndicator — the "model is reasoning" affordance.
 *
 * Mentor tip: "The thinking indicator and the first token are a handoff, not
 * a swap — if the indicator vanishes one frame before text appears, the
 * interface flickers. Transition one into the other."
 *
 * Implementation:
 *  – Three dots, staggered pulse (framer-motion).
 *  – "Thinking…" label next to them, never blank.
 *  – The component is rendered INSIDE the assistant bubble so when the first
 *    token arrives, the bubble already exists and only the indicator swaps
 *    out — no layout shift, no flicker.
 *  – Honours prefers-reduced-motion: dots become a static "Thinking" label.
 */
"use client";

import { motion, useReducedMotion } from "framer-motion";

export function ThinkingIndicator() {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
        <span>Thinking…</span>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 py-1 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-label="Assistant is thinking"
    >
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
            initial={{ opacity: 0.25, y: 0 }}
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
      <span className="font-normal">Thinking…</span>
    </div>
  );
}
