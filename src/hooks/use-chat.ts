"use client";

import { useState, useCallback, useRef } from "react";
import { AgentId, ChatMessage } from "@/lib/types";

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

        const data = await response.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
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
