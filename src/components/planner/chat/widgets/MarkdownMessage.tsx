/**
 * MarkdownMessage - Renders markdown content in chat messages
 */

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

/** Block dangerous URI schemes (javascript:, data:, vbscript:, tab:) */
function sanitizeHref(href: string | undefined): string {
  if (!href) return "#";
  if (/^(javascript|data|vbscript|tab):/i.test(href)) return "#";
  return href;
}

export function MarkdownMessage({ content, className, isStreaming }: MarkdownMessageProps) {
  // During streaming: render raw text (no markdown parsing) for instant word-by-word display.
  // ReactMarkdown re-parses from scratch on every token → browser batches renders into blocks.
  // Raw text = zero overhead = each token appears immediately, exactly like Claude/ChatGPT.
  if (isStreaming) {
    return (
      <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", className)}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none transition-opacity duration-150", className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          a: ({ href, children }) => (
            <a
              href={sanitizeHref(href)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
