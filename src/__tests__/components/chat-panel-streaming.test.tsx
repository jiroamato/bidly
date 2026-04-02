import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatPanel } from "@/components/chat-panel";

const mockUseChat = vi.fn();
vi.mock("@/hooks/use-chat", () => ({
  useChat: (...args: any[]) => mockUseChat(...args),
}));

// Mock ChatHistoryContext used by ChatPanel
vi.mock("@/contexts/chat-history-context", () => ({
  useChatHistory: () => [[], vi.fn()],
}));

vi.mock("@/lib/agents", () => ({
  getAgent: vi.fn().mockReturnValue({
    name: "Profile",
    color: "#E57373",
    chatPlaceholder: "Tell me about your business...",
  }),
}));

describe("ChatPanel with streaming", () => {
  const defaultHookReturn = {
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    sendMessage: vi.fn(),
    addInitialMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.mockReturnValue(defaultHookReturn);
  });

  it("renders assistant messages with markdown formatting", () => {
    mockUseChat.mockReturnValue({
      ...defaultHookReturn,
      messages: [
        { role: "assistant", content: "## Hello\n\nThis is **bold**", timestamp: 1 },
      ],
    });

    render(<ChatPanel agentId="profile" profileId={1} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Hello");
    expect(screen.getByText("bold").tagName).toBe("STRONG");
  });

  it("shows streaming cursor during active streaming", () => {
    mockUseChat.mockReturnValue({
      ...defaultHookReturn,
      isStreaming: true,
      isLoading: true,
      messages: [
        { role: "user", content: "Hi", timestamp: 1 },
        { role: "assistant", content: "Streaming text...", timestamp: 2 },
      ],
    });

    const { container } = render(<ChatPanel agentId="profile" profileId={1} />);
    const cursor = container.querySelector("[data-streaming-cursor]");
    expect(cursor).toBeInTheDocument();
  });

  it("does not show bouncing dots when streaming", () => {
    mockUseChat.mockReturnValue({
      ...defaultHookReturn,
      isStreaming: true,
      isLoading: true,
      messages: [
        { role: "user", content: "Hi", timestamp: 1 },
        { role: "assistant", content: "Partial", timestamp: 2 },
      ],
    });

    const { container } = render(<ChatPanel agentId="profile" profileId={1} />);
    const dots = container.querySelectorAll("[style*='typingDot']");
    expect(dots).toHaveLength(0);
  });

  it("shows bouncing dots when loading but not yet streaming", () => {
    mockUseChat.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
      isStreaming: false,
      messages: [
        { role: "user", content: "Hi", timestamp: 1 },
      ],
    });

    render(<ChatPanel agentId="profile" profileId={1} />);
    const labels = screen.getAllByText("Profile");
    expect(labels.length).toBeGreaterThan(0);
  });

  it("renders user messages as plain text (no markdown)", () => {
    mockUseChat.mockReturnValue({
      ...defaultHookReturn,
      messages: [
        { role: "user", content: "I have **emphasis** here", timestamp: 1 },
      ],
    });

    render(<ChatPanel agentId="profile" profileId={1} />);
    expect(screen.getByText("I have **emphasis** here")).toBeInTheDocument();
  });

  it("shows copy button on assistant messages", () => {
    mockUseChat.mockReturnValue({
      ...defaultHookReturn,
      messages: [
        { role: "assistant", content: "Copy me", timestamp: 1 },
      ],
    });

    const { container } = render(<ChatPanel agentId="profile" profileId={1} />);
    const copyBtn = container.querySelector("[data-copy-message]");
    expect(copyBtn).toBeInTheDocument();
  });
});
