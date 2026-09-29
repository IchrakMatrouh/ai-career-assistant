/**
 * EmptyState — what the user sees before their first message.
 *
 * Shows a short description of the streaming demo plus four suggested prompts
 * the reviewer can one-click to verify:
 *   – "Stream me a haiku"                  → tiny, fast token stream
 *   – "Explain SSE in 3 steps"            → markdown bullets, mid-length
 *   – "Write a JS debounce function"      → fenced code block
 *   – "Count from 1 to 20 slowly"          → lets the reviewer watch tokens
 *                                              arrive one at a time + test stop
 */
"use client";

import { motion } from "framer-motion";

const SUGGESTIONS: { title: string; prompt: string; emoji: string }[] = [
  {
    title: "Stream a haiku",
    prompt: "Write me a haiku about streaming tokens, one word per line so I can watch them arrive.",
    emoji: "\u2728",
  },
  {
    title: "Explain SSE in 3 steps",
    prompt: "Explain Server-Sent Events in three numbered steps. Keep each step to two sentences.",
    emoji: "\u{1F50C}",
  },
  {
    title: "Debounce in JS",
    prompt: "Show me a small `debounce` function in TypeScript with comments, then explain how the leading-edge vs trailing-edge variants differ.",
    emoji: "\u{1F4BB}",
  },
  {
    title: "Count slowly",
    prompt: "Count slowly from 1 to 20, one number per line. I'm going to press Stop halfway to test the stop button.",
    emoji: "\u{1F9EE}",
  },
];

interface Props {
  onPick: (prompt: string) => void;
}

export function EmptyState({ onPick }: Props) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-bold text-white shadow-md"
        >
          AI
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Streaming AI chat
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          An open chat session over a live token stream. Send a message —
          tokens arrive one at a time. Press <span className="font-medium text-foreground">Stop</span> mid-stream,
          then send again; state should survive.
        </p>
      </motion.div>

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.title}
            type="button"
            onClick={() => onPick(s.prompt)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 * i }}
            className="group flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-ring/40 hover:bg-muted/40"
          >
            <span aria-hidden="true" className="text-base leading-none">{s.emoji}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{s.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{s.prompt}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
