import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Track what useChatHistory was called with
const mockUseChatHistory = vi.fn().mockReturnValue([[], vi.fn()]);

vi.mock("@/contexts/chat-history-context", () => ({
  useChatHistory: (...args: any[]) => mockUseChatHistory(...args),
}));

vi.mock("@/hooks/use-chat", () => ({
  useChat: () => ({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    sendMessage: vi.fn(),
    addInitialMessage: vi.fn(),
  }),
}));

describe("ChatPanel context integration", () => {
  it("calls useChatHistory with the agentId", async () => {
    const { ChatPanel } = await import("@/components/chat-panel");
    render(<ChatPanel agentId="analyst" />);
    expect(mockUseChatHistory).toHaveBeenCalledWith("analyst");
  });
});
