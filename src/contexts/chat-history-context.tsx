"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { type AgentId, type ChatMessage } from "@/lib/types";

type ChatHistoryMap = Record<AgentId, ChatMessage[]>;

const INITIAL_STATE: ChatHistoryMap = {
  profile: [],
  scout: [],
  analyst: [],
  compliance: [],
  writer: [],
};

interface ChatHistoryContextValue {
  history: ChatHistoryMap;
  setAgentMessages: (agentId: AgentId, updater: SetStateAction<ChatMessage[]>) => void;
  clearAllMessages: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ChatHistoryMap>({ ...INITIAL_STATE });

  const setAgentMessages = useCallback(
    (agentId: AgentId, updater: SetStateAction<ChatMessage[]>) => {
      setHistory((prev) => ({
        ...prev,
        [agentId]:
          typeof updater === "function" ? updater(prev[agentId]) : updater,
      }));
    },
    [],
  );

  const clearAllMessages = useCallback(() => {
    setHistory({
      profile: [],
      scout: [],
      analyst: [],
      compliance: [],
      writer: [],
    });
  }, []);

  return (
    <ChatHistoryContext value={{ history, setAgentMessages, clearAllMessages }}>
      {children}
    </ChatHistoryContext>
  );
}

export function useChatHistory(
  agentId: AgentId,
): [ChatMessage[], Dispatch<SetStateAction<ChatMessage[]>>] {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) throw new Error("useChatHistory must be used within ChatHistoryProvider");

  const messages = ctx.history[agentId];
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = useCallback(
    (updater) => ctx.setAgentMessages(agentId, updater),
    [ctx.setAgentMessages, agentId],
  );

  return [messages, setMessages];
}

export function useChatHistoryActions() {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) throw new Error("useChatHistoryActions must be used within ChatHistoryProvider");
  return { clearAllMessages: ctx.clearAllMessages };
}
