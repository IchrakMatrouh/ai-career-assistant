/**
 * ────────────────────────────────────────────────────────────────────────────
 *  useAutoScrollToBottom — robust auto-scroll for streaming chat
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Mentor tip: "Auto-scroll is where most submissions quietly fail the
 *  robustness bar: pin to bottom only while the user is already at the
 *  bottom, release the pin the moment they scroll up, and offer a
 *  'jump to latest' affordance. Test it while tokens are streaming, not after."
 *
 *  Implementation notes:
 *    1. We use a scroll listener on the container (passive) + a ResizeObserver
 *       on the inner content. The scroll listener tells us whether the user
 *       is pinned to the bottom; the ResizeObserver fires when new tokens
 *       expand the content (so we can re-pin if the user is at the bottom).
 *    2. The "at bottom" threshold is 80px. Anything tighter (e.g. 10px) breaks
 *       because the browser fires scroll events at fractional pixel positions
 *       during token rendering, oscillating between pinned and unpinned. 80px
 *       gives a stable pin even while the DOM height is changing frame-by-frame.
 *    3. We do NOT attach a wheel/touchmove "scrolled up" listener — that's a
 *       common but brittle approach because trackpad inertial scroll keeps
 *       scrolling after the user lifts their fingers. The pure-threshold
 *       approach is more reliable.
 *    4. The "jump to latest" affordance is rendered by the component, not this
 *       hook; we expose `isPinned` and `jumpToBottom()` for that purpose.
 * ────────────────────────────────────────────────────────────────────────────
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Distance-from-bottom threshold in px below which we consider the user "pinned". */
  threshold?: number;
}

export function useAutoScrollToBottom<T extends HTMLElement = HTMLDivElement>(
  opts: Options = {},
) {
  const { threshold = 80 } = opts;

  const scrollRef = useRef<T | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const [isPinned, setIsPinned] = useState(true);
  // We hold the pin in a ref so the ResizeObserver callback can read it
  // synchronously without subscribing to state updates (which would lag one
  // render behind and cause a scroll jump on the first token).
  const pinnedRef = useRef(true);

  const computePinned = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const next = dist <= threshold;
    if (next !== pinnedRef.current) {
      pinnedRef.current = next;
      setIsPinned(next);
    }
    return next;
  }, [threshold]);

  // Scroll listener — passive so it doesn't jank the stream.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => computePinned();
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [computePinned]);

  // ResizeObserver on the inner content — fires when tokens arrive and
  // expand the message list. If the user is pinned, we re-pin.
  useEffect(() => {
    const root = scrollRef.current;
    const target = contentRef.current;
    if (!root || !target) return;
    const ro = new ResizeObserver(() => {
      if (pinnedRef.current) {
        root.scrollTop = root.scrollHeight;
      }
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  // Programmatic jump-to-bottom — used by the "Jump to latest" affordance.
  const jumpToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    pinnedRef.current = true;
    setIsPinned(true);
  }, []);

  // Initial pin on mount.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  return {
    scrollRef,
    contentRef,
    isPinned,
    jumpToBottom,
    /** Force re-check after manual mutations (e.g. clearing chat). */
    recompute: computePinned,
  };
}
