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

export function MarkdownMessage({ content, isStreaming = false }: MarkdownMessageProps) {
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <h2
              className="text-base font-semibold mt-4 mb-2"
              style={{ color: "var(--text-primary)" }}
              {...(props as ComponentPropsWithoutRef<"h2">)}
            >
              {children}
            </h2>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="text-base font-semibold mt-4 mb-2"
              style={{ color: "var(--text-primary)" }}
              {...(props as ComponentPropsWithoutRef<"h2">)}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="text-sm font-semibold mt-3 mb-1.5"
              style={{ color: "var(--text-primary)" }}
              {...(props as ComponentPropsWithoutRef<"h3">)}
            >
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p
              className="mb-3 leading-[1.7]"
              {...(props as ComponentPropsWithoutRef<"p">)}
            >
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul
              className="mb-3 ml-4 list-disc space-y-1"
              {...(props as ComponentPropsWithoutRef<"ul">)}
            >
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol
              className="mb-3 ml-4 list-decimal space-y-1"
              {...(props as ComponentPropsWithoutRef<"ol">)}
            >
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li
              className="leading-[1.6]"
              {...(props as ComponentPropsWithoutRef<"li">)}
            >
              {children}
            </li>
          ),
          code: ({ children, className, ...props }) => {
            const isCodeBlock = className?.includes("language-");
            if (isCodeBlock) {
              return (
                <code className={className} {...(props as ComponentPropsWithoutRef<"code">)}>
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
                {...(props as ComponentPropsWithoutRef<"code">)}
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => {
            const codeElement = (children as any)?.props;
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
                  {...(props as ComponentPropsWithoutRef<"pre">)}
                >
                  {children}
                </pre>
                <CopyButton text={codeText.replace(/\n$/, "")} />
              </div>
            );
          },
          table: ({ children, ...props }) => (
            <div className="mb-3 overflow-x-auto">
              <table
                className="w-full text-[12px]"
                style={{ borderCollapse: "collapse" }}
                {...(props as ComponentPropsWithoutRef<"table">)}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="text-left px-3 py-2 font-semibold"
              style={{
                borderBottom: "2px solid var(--bidly-border, #e0e0e0)",
                fontFamily: "var(--font-mono)",
              }}
              {...(props as ComponentPropsWithoutRef<"th">)}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-3 py-2"
              style={{
                borderBottom: "1px solid var(--border-light, #e0e0e0)",
              }}
              {...(props as ComponentPropsWithoutRef<"td">)}
            >
              {children}
            </td>
          ),
          strong: ({ children, ...props }) => (
            <strong
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
              {...(props as ComponentPropsWithoutRef<"strong">)}
            >
              {children}
            </strong>
          ),
          hr: (props) => (
            <hr
              className="my-4"
              style={{ borderColor: "var(--border-light, #e0e0e0)" }}
              {...(props as ComponentPropsWithoutRef<"hr">)}
            />
          ),
        }}
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
