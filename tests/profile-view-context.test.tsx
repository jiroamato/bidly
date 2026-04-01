import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

Element.prototype.scrollIntoView = vi.fn();

const mockSetMessages = vi.fn();
let mockMessages: any[] = [];

vi.mock("@/contexts/chat-history-context", () => ({
  useChatHistory: () => [mockMessages, mockSetMessages],
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeAgentState(overrides = {}) {
  return {
    activeAgent: "profile" as const,
    statuses: { profile: "active" as const, scout: "locked" as const, analyst: "locked" as const, compliance: "locked" as const, writer: "locked" as const },
    profile: null,
    profileId: null,
    selectedTender: null,
    tenderId: null,
    matchedTenders: [],
    tenderAnalysis: null,
    setActiveAgent: vi.fn(),
    completeAgent: vi.fn(),
    setProfile: vi.fn(),
    setSelectedTender: vi.fn(),
    setMatchedTenders: vi.fn(),
    setTenderAnalysis: vi.fn(),
    resetDemo: vi.fn(),
    ...overrides,
  };
}

describe("ProfileView context integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 1, company_name: "" }) });
  });

  it("seeds initial message when context messages are empty", async () => {
    const { ProfileView } = await import("@/components/views/profile-view");
    await act(async () => {
      render(<ProfileView agent={makeAgentState()} />);
    });

    expect(mockSetMessages).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: "assistant", content: expect.stringContaining("Welcome to Bidly") }),
      ]),
    );
  });

  it("does not re-seed when context already has messages", async () => {
    mockMessages = [{ role: "user", content: "existing msg", timestamp: 1 }];

    const { ProfileView } = await import("@/components/views/profile-view");
    await act(async () => {
      render(<ProfileView agent={makeAgentState()} />);
    });

    // Should NOT have been called with the initial welcome message
    const seedCalls = mockSetMessages.mock.calls.filter((call: any[]) => {
      const arg = call[0];
      if (Array.isArray(arg) && arg.length === 1 && arg[0].content?.includes("Welcome to Bidly")) return true;
      return false;
    });
    expect(seedCalls).toHaveLength(0);
  });
});
