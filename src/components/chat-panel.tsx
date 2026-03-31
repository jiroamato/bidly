"use client";

import { useState, useRef, useEffect } from "react";
import { AgentId, BusinessProfile, Tender } from "@/lib/types";
import { getAgent } from "@/lib/agents";
import { useChat } from "@/hooks/use-chat";

interface ChatPanelProps {
  agentId: AgentId;
  profileId?: number;
  tenderId?: number;
  /** @deprecated Use tenderId instead. Kept for backward compat with views not yet migrated. */
  selectedTender?: Tender | null;
  /** @deprecated Use profileId instead. Kept for backward compat with views not yet migrated. */
  profile?: BusinessProfile | null;
  externalValue?: string;
}

export function ChatPanel({ agentId, profileId, tenderId, selectedTender, profile, externalValue }: ChatPanelProps) {
  // Derive IDs from objects if the new-style props aren't provided (backward compat)
  const resolvedProfileId = profileId ?? profile?.id;
  const resolvedTenderId = tenderId ?? selectedTender?.id;

  const { messages, isLoading, error, sendMessage } = useChat(agentId, resolvedProfileId, resolvedTenderId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agent = getAgent(agentId);

  // Sync external value (e.g. from demo script) into the input field
  useEffect(() => {
    if (externalValue !== undefined) {
      setInputValue(externalValue);
    }
  }, [externalValue]);

  // Auto-expand only when message count increases
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      setIsExpanded(true);
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    sendMessage(text);
    setInputValue("");
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-shrink-0 flex flex-col">
      {/* Message Thread */}
      {isExpanded && hasMessages && (
        <div
          className="border-t overflow-y-auto"
          style={{
            maxHeight: "45vh",
            borderColor: "var(--bidly-border)",
            background: "var(--white)",
            animation: "chatPanelReveal 0.25s ease-out forwards",
          }}
        >
          {/* Thread header */}
          <div
            className="sticky top-0 flex items-center justify-between px-8 py-2.5 border-b"
            style={{
              background: "var(--sidebar-bg)",
              borderColor: "var(--border-light)",
              zIndex: 2,
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: agent.color }}
              />
              <span
                className="text-[10px] tracking-[2px] uppercase"
                style={{ fontFamily: "var(--font-mono)", color: agent.color }}
              >
                {agent.name} Chat
              </span>
              <span
                className="text-[10px]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
              >
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[10px] tracking-[1px] uppercase px-2.5 py-1 transition-colors"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Collapse
            </button>
          </div>

          {/* Messages */}
          <div className="px-8 py-5 space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: "profileReveal 0.3s ease-out forwards" }}
              >
                {msg.role === "assistant" ? (
                  <div className="max-w-[85%] flex gap-3">
                    <div
                      className="w-0.5 flex-shrink-0 mt-1 rounded-full"
                      style={{ background: agent.color, minHeight: 16 }}
                    />
                    <div>
                      <div
                        className="text-[9px] tracking-[2px] uppercase mb-1.5"
                        style={{ fontFamily: "var(--font-mono)", color: agent.color }}
                      >
                        {agent.name}
                      </div>
                      <div
                        className="text-[13px] leading-[1.7] whitespace-pre-wrap"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[70%]">
                    <div
                      className="text-[9px] tracking-[2px] uppercase mb-1.5 text-right"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                    >
                      You
                    </div>
                    <div
                      className="text-[13px] leading-[1.7] px-4 py-2.5"
                      style={{
                        background: "var(--bg)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div
                  className="w-0.5 flex-shrink-0 rounded-full"
                  style={{ background: agent.color, opacity: 0.4, minHeight: 16 }}
                />
                <div>
                  <div
                    className="text-[9px] tracking-[2px] uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-mono)", color: agent.color, opacity: 0.5 }}
                  >
                    {agent.name}
                  </div>
                  <div className="flex gap-1.5 py-1">
                    {[0, 1, 2].map((dot) => (
                      <div
                        key={dot}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: agent.color,
                          animation: `typingDot 1.4s ease-in-out ${dot * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="text-[12px] px-4 py-2.5 border-l-2"
                style={{
                  color: "var(--accent-red)",
                  borderColor: "var(--accent-red)",
                  background: "#fef3f2",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div
        className="px-10 py-4 pb-6"
        style={{
          background: hasMessages
            ? "var(--bg)"
            : "linear-gradient(transparent, var(--bg) 20%)",
          borderTop: hasMessages ? "1px solid var(--bidly-border)" : "none",
        }}
      >
        <div
          className="flex border"
          style={{
            borderColor: "var(--bidly-border)",
            background: "var(--white)",
          }}
        >
          <div
            className="px-4 py-3.5 border-r text-[10px] tracking-[1.5px] uppercase whitespace-nowrap flex items-center"
            style={{
              fontFamily: "var(--font-mono)",
              color: agent.color,
              borderColor: "var(--bidly-border)",
              background: "var(--sidebar-bg)",
            }}
          >
            {agent.name}
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={agent.chatPlaceholder}
            disabled={isLoading}
            className="flex-1 border-none outline-none text-sm px-4 py-3.5"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
              background: "transparent",
              opacity: isLoading ? 0.5 : 1,
            }}
          />
          {/* Message count badge when collapsed */}
          {hasMessages && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1.5 px-3 transition-colors"
              style={{
                fontFamily: "var(--font-mono)",
                color: agent.color,
                cursor: "pointer",
                background: "var(--sidebar-bg)",
                border: "none",
                borderLeft: "1px solid var(--bidly-border)",
                fontSize: 10,
              }}
            >
              <span>{messages.length}</span>
              <span style={{ fontSize: 8 }}>&#9650;</span>
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-3.5 text-[11px] font-semibold tracking-[1.5px] uppercase border-none cursor-pointer transition-opacity"
            style={{
              fontFamily: "var(--font-mono)",
              background: "var(--text-primary)",
              color: "var(--white)",
              opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
            }}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
