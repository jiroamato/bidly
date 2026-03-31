"use client";

import { useState, useCallback, useRef } from "react";
import { AgentId, ChatMessage } from "@/lib/types";
import { consumeSSEStream } from "@/lib/sse";

export function useChat(agentId: AgentId, profileId?: number, tenderId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      const userMessage: ChatMessage = {
        role: "user",
        content,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messagesRef.current, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            messages: updatedMessages,
            profileId,
            tenderId,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI request failed: ${response.status}`);
        }

        // Stream SSE response
        const reader = response.body?.getReader();

        // Add an empty assistant message to fill incrementally
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (reader) {
          await consumeSSEStream(reader, (accumulated) => {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulated,
              };
              return updated;
            });
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [agentId, profileId, tenderId]
  );

  const addInitialMessage = useCallback((content: string) => {
    setMessages([
      { role: "assistant", content, timestamp: Date.now() },
    ]);
  }, []);

  return { messages, isLoading, error, sendMessage, addInitialMessage };
}
