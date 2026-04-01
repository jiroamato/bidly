import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Track isLoading transitions to verify callback fires
let mockIsLoading = false;
let mockIsStreaming = false;
const mockSendMessage = vi.fn();

vi.mock("@/hooks/use-chat", () => ({
  useChat: () => ({
    messages: [],
    isLoading: mockIsLoading,
    isStreaming: mockIsStreaming,
    error: null,
    sendMessage: mockSendMessage,
    addInitialMessage: vi.fn(),
  }),
}));

describe("ChatPanel onResponseComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsStreaming = false;
  });

  it("accepts onResponseComplete prop without error", async () => {
    const onResponseComplete = vi.fn();
    const { ChatPanel } = await import("@/components/chat-panel");

    expect(() => {
      render(<ChatPanel agentId="writer" onResponseComplete={onResponseComplete} />);
    }).not.toThrow();
  });
});
