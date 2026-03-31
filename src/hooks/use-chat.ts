"use client";

import { useState, useCallback, useRef } from "react";
import { AgentId, ChatMessage } from "@/lib/types";

export function useChat(agentId: AgentId, profileId?: number, tenderId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      const userMessage: ChatMessage = { role: "user", content, timestamp: Date.now() };
      const updatedMessages = [...messagesRef.current, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, messages: updatedMessages, profileId, tenderId }),
        });

        if (!response.ok) {
          throw new Error(`AI request failed: ${response.status}`);
        }

        const assistantMessage: ChatMessage = { role: "assistant", content: "", timestamp: Date.now() };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsStreaming(true);

        if (!response.body) {
          throw new Error("Response body is not readable");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let sseBuffer = "";
        let rafScheduled = false;

        const flushToState = () => {
          rafScheduled = false;
          const content = accumulated;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant") {
              copy[copy.length - 1] = { ...last, content };
            }
            return copy;
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
                continue;
              }
              if (parsed.text) {
                accumulated += parsed.text;
                if (!rafScheduled) {
                  rafScheduled = true;
                  requestAnimationFrame(flushToState);
                }
              }
            } catch { /* skip malformed chunks */ }
          }
        }
        // Final flush to ensure all accumulated text is rendered
        flushToState();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsStreaming(false);
        setIsLoading(false);
      }
    },
    [agentId, profileId, tenderId]
  );

  const addInitialMessage = useCallback((content: string) => {
    setMessages([{ role: "assistant", content, timestamp: Date.now() }]);
  }, []);

  return { messages, isLoading, isStreaming, error, sendMessage, addInitialMessage };
}
