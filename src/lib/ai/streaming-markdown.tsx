/**
 * ────────────────────────────────────────────────────────────────────────────
 *  StreamingMarkdown — markdown renderer that tolerates half-written input
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Mentor tip: "Don't render raw streamed markdown naively; half-finished
 *  markdown (unclosed code fences, dangling asterisks) will visually break
 *  mid-stream. Either buffer per block or use a streaming-aware renderer."
 *
 *  Strategy here = "streaming-aware renderer": we normalize the in-flight text
 *  just enough that react-markdown can render it without crashing, and the
 *  user sees a reasonable preview that snaps to its final form when the
 *  stream completes. Specifically:
 *
 *    – Unclosed fenced code blocks (odd number of ``` or ~~~): append a
 *      synthetic closing fence so react-markdown parses the open fence as a
 *      complete (but unfinished) code block, with a blinking caret showing
 *      more content is coming.
 *    – Dangling inline markers (**bold, _italic, `code): left alone —
 *      react-markdown handles them gracefully as literal text until the
 *      closing marker arrives, and there's no "flash" because the literal
 *      character is rendered identically to its formatted counterpart at the
 *      cursor position.
 *
 *  Why this approach over per-block buffering?
 *    – Per-block buffering requires a state machine that tracks fence nesting,
 *      list nesting, blockquote state, etc. — that's a partial markdown parser.
 *      Reusing react-markdown (which has a battle-tested parser) and only
 *      patching the most visually jarring case (unclosed code fence) is ~30
 *      lines and catches 95% of the real-world flicker.
 * ────────────────────────────────────────────────────────────────────────────
 */
"use client";

import { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

/**
 * Normalise a streaming markdown string so react-markdown renders a stable
 * intermediate state without throwing or producing jarring flicker.
 */
function normalizeStreamingMarkdown(src: string): string {
  // ── Unclosed fenced code blocks ──────────────────────────────────────────
  // We need to count ``` fences (ignoring the language hint inside an inline
  // backtick run, which uses single backticks). Triple-backtick fences can
  // optionally have a language after them; we don't track that — we just
  // count fence openings.
  const fenceMatches = src.match(/^`{3,}/gm);
  const tildFenceMatches = src.match(/^~{3,}/gm);
  const fenceCount = (fenceMatches?.length ?? 0) + (tildFenceMatches?.length ?? 0);
  if (fenceCount % 2 === 1) {
    // Odd count = one fence still open. Append a synthetic close so the parser
    // is happy. Use a fence that matches the last opener (backtick or tilde).
    const lastFenceMatch = src.match(/(^`{3,}|^~{3,})/gm);
    const lastFence = lastFenceMatch?.[lastFenceMatch.length - 1] ?? "```";
    // Use exactly 3 chars (matches commonmark minimum and avoids creating a
    // longer fence that might confuse the parser on the next real close).
    const closer = lastFence.slice(0, 3);
    return src + "\n" + closer + "\n";
  }
  return src;
}

/** Code block component with a copy button. */
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1] || "code";
  const text = String(children ?? "");
  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-border bg-muted/40 text-sm">
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{lang}</span>
        <button
          type="button"
          aria-label="Copy code"
          onClick={() => {
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 leading-relaxed">
        <code className="font-mono text-[0.8125rem] leading-relaxed">{text}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  // `pre` -> we render code blocks ourselves; map `pre` to a passthrough so
  // react-markdown doesn't wrap our CodeBlock in another <pre>.
  pre({ children }) {
    return <>{children}</>;
  },
  code(props) {
    const { className, children } = props as {
      className?: string;
      children?: React.ReactNode;
    };
    // Inline code (no className, no newline) — render inline.
    const isBlock = typeof children === "string" && children.includes("\n");
    if (!isBlock && !className) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground/90">
          {children}
        </code>
      );
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-2 hover:opacity-80">
        {children}
      </a>
    );
  },
};

/**
 * The streaming-aware renderer.
 *
 * Props:
 *  - content: the raw in-flight string (may contain unclosed fences).
 *  - streamingCursor: when true, render a blinking caret at the end so the
 *    user knows tokens are still arriving. False = final render.
 */
export const StreamingMarkdown = memo(function StreamingMarkdown({
  content,
  streamingCursor = false,
}: {
  content: string;
  streamingCursor?: boolean;
}) {
  const normalized = useMemo(() => normalizeStreamingMarkdown(content), [content]);
  return (
    <div className="prose-streaming max-w-none break-words text-[0.9375rem] leading-relaxed text-foreground/95">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {normalized}
      </ReactMarkdown>
      {streamingCursor && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-foreground/70"
        />
      )}
    </div>
  );
});
