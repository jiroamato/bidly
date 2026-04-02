import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock useChat
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

// Mock ChatHistoryContext (used by ChatPanel after chat-persistence feature)
vi.mock("@/contexts/chat-history-context", () => ({
  useChatHistory: () => [[], vi.fn()],
}));

describe("WriterView", () => {
  it("does not contain MOCK_CONTENT constant", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    expect(content).not.toContain("MOCK_CONTENT");
  });

  it("does not contain PDF_PRICING constant", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    expect(content).not.toContain("PDF_PRICING");
    expect(content).not.toContain("PDF_MONTHLY_TOTAL");
    expect(content).not.toContain("PDF_ANNUAL_TOTAL");
    expect(content).not.toContain("PDF_GST");
    expect(content).not.toContain("PDF_GRAND_TOTAL");
  });

  it("does not contain hardcoded section statuses", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    // Should not have hardcoded "done" or "draft" in SECTIONS array
    expect(content).not.toMatch(/status:\s*["']done["']/);
    expect(content).not.toMatch(/status:\s*["']draft["']/);
  });
});

describe("WriterView — reactive drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return empty drafts
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sections: {} }),
    });
  });

  it("accepts externalActiveSection prop", async () => {
    const { WriterView } = await import("@/components/views/writer-view");
    const { render } = await import("@testing-library/react");
    const { act } = await import("@testing-library/react");

    const agent = {
      activeAgent: "writer" as const,
      statuses: { profile: "completed" as const, scout: "completed" as const, analyst: "completed" as const, compliance: "completed" as const, writer: "active" as const },
      profile: { id: 1, company_name: "Test" } as any,
      selectedTender: { id: 42 } as any,
    };

    await act(async () => {
      render(<WriterView agent={agent} externalActiveSection="preview" />);
    });

    // Should not throw — the prop is accepted
  });
});
