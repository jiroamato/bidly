"use client";

import { useState, useCallback, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";

interface MarkdownMessageProps {
  content: string;
  isStreaming?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy code"
      className="absolute top-2 right-2 p-1.5 rounded transition-colors"
      style={{
        background: "var(--bg, #f5f5f5)",
        color: "var(--text-muted, #666)",
        border: "1px solid var(--border-light, #e0e0e0)",
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

const REMARK_PLUGINS = [remarkGfm];

const MD_COMPONENTS = {
  h1: ({ children, ...props }: ComponentPropsWithoutRef<"h2"> & { children?: React.ReactNode }) => (
    <h2
      className="text-base font-semibold mt-4 mb-2"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      {children}
    </h2>
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2"> & { children?: React.ReactNode }) => (
    <h2
      className="text-base font-semibold mt-4 mb-2"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3"> & { children?: React.ReactNode }) => (
    <h3
      className="text-sm font-semibold mt-3 mb-1.5"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }: ComponentPropsWithoutRef<"p"> & { children?: React.ReactNode }) => (
    <p
      className="mb-3 leading-[1.7]"
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }: ComponentPropsWithoutRef<"ul"> & { children?: React.ReactNode }) => (
    <ul
      className="mb-3 ml-4 list-disc space-y-1"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: ComponentPropsWithoutRef<"ol"> & { children?: React.ReactNode }) => (
    <ol
      className="mb-3 ml-4 list-decimal space-y-1"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }: ComponentPropsWithoutRef<"li"> & { children?: React.ReactNode }) => (
    <li
      className="leading-[1.6]"
      {...props}
    >
      {children}
    </li>
  ),
  code: ({ children, className, ...props }: ComponentPropsWithoutRef<"code"> & { children?: React.ReactNode }) => {
    const isCodeBlock = className?.includes("language-");
    if (isCodeBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded text-[12px]"
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--sidebar-bg, #f8f8f8)",
          color: "var(--text-primary)",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: ComponentPropsWithoutRef<"pre"> & { children?: any }) => {
    const codeElement = children?.props;
    const codeText = typeof codeElement?.children === "string"
      ? codeElement.children
      : String(codeElement?.children || "");

    return (
      <div className="relative mb-3">
        <pre
          className="p-4 rounded overflow-x-auto text-[12px] leading-[1.6]"
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--sidebar-bg, #f8f8f8)",
            border: "1px solid var(--border-light, #e0e0e0)",
          }}
          {...props}
        >
          {children}
        </pre>
        <CopyButton text={codeText.replace(/\n$/, "")} />
      </div>
    );
  },
  table: ({ children, ...props }: ComponentPropsWithoutRef<"table"> & { children?: React.ReactNode }) => (
    <div className="mb-3 overflow-x-auto">
      <table
        className="w-full text-[12px]"
        style={{ borderCollapse: "collapse" }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: ComponentPropsWithoutRef<"th"> & { children?: React.ReactNode }) => (
    <th
      className="text-left px-3 py-2 font-semibold"
      style={{
        borderBottom: "2px solid var(--bidly-border, #e0e0e0)",
        fontFamily: "var(--font-mono)",
      }}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: ComponentPropsWithoutRef<"td"> & { children?: React.ReactNode }) => (
    <td
      className="px-3 py-2"
      style={{
        borderBottom: "1px solid var(--border-light, #e0e0e0)",
      }}
      {...props}
    >
      {children}
    </td>
  ),
  strong: ({ children, ...props }: ComponentPropsWithoutRef<"strong"> & { children?: React.ReactNode }) => (
    <strong
      className="font-semibold"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      {children}
    </strong>
  ),
  hr: (props: ComponentPropsWithoutRef<"hr">) => (
    <hr
      className="my-4"
      style={{ borderColor: "var(--border-light, #e0e0e0)" }}
      {...props}
    />
  ),
};

export function MarkdownMessage({ content, isStreaming = false }: MarkdownMessageProps) {
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={MD_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          data-streaming-cursor=""
          className="inline-block w-[2px] h-[1em] ml-0.5 align-text-bottom"
          style={{
            background: "var(--text-primary)",
            animation: "cursorBlink 1s step-end infinite",
          }}
        />
      )}
    </div>
  );
}
