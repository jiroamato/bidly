"use client";

import { useState, useEffect, useRef } from "react";
import { AgentId } from "@/lib/types";
import { getAgent } from "@/lib/agents";

interface ChatInputProps {
  agentId: AgentId;
  onSend: (message: string) => void;
  disabled?: boolean;
  externalValue?: string;
}

export function ChatInput({ agentId, onSend, disabled, externalValue }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const agent = getAgent(agentId);

  // Sync external value during render (not useEffect) to avoid extra render cycles
  const prevExternalRef = useRef(externalValue);
  if (externalValue !== prevExternalRef.current) {
    prevExternalRef.current = externalValue;
    if (externalValue !== undefined && externalValue !== value) {
      setValue(externalValue);
    }
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div
      className="sticky bottom-0 px-10 py-4 pb-6"
      style={{
        background: "linear-gradient(transparent, var(--bg) 20%)",
      }}
    >
      <div
        className="flex border"
        style={{
          borderColor: "var(--bidly-border)",
          background: "var(--white)",
          opacity: disabled ? 0.5 : 1,
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
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={agent.chatPlaceholder}
          disabled={disabled}
          rows={1}
          className="flex-1 border-none outline-none text-sm px-4 py-3.5 resize-none"
          style={{
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
            background: "transparent",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="px-6 py-3.5 text-[11px] font-semibold tracking-[1.5px] uppercase border-none cursor-pointer"
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--text-primary)",
            color: "var(--white)",
          }}
        >
          {agentId === "profile" ? "Send" : "Ask"}
        </button>
      </div>
    </div>
  );
}
