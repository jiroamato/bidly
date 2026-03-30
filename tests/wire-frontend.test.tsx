import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Mock useChat before importing components
const mockSendMessage = vi.fn();
vi.mock("@/hooks/use-chat", () => ({
  useChat: () => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: mockSendMessage,
    addInitialMessage: vi.fn(),
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeAgentState(overrides = {}) {
  return {
    activeAgent: "scout" as const,
    statuses: {
      profile: "completed" as const,
      scout: "active" as const,
      analyst: "locked" as const,
      compliance: "locked" as const,
      writer: "locked" as const,
    },
    profile: {
      id: 1, company_name: "Test Corp", naics_codes: ["238220"],
      location: "Toronto", province: "Ontario", capabilities: "Plumbing",
      keywords: ["plumbing"], created_at: "2026-01-01",
    },
    selectedTender: {
      id: 42, reference_number: "REF-001", solicitation_number: "SOL-001",
      title: "Test Tender", description: "Test desc",
      publication_date: "2026-01-01", closing_date: "2026-04-15",
      status: "Open", procurement_category: "CNST" as const,
      notice_type: "RFP", procurement_method: "Competitive",
      selection_criteria: "", gsin_codes: [], unspsc_codes: [],
      regions_of_opportunity: ["Ontario"], regions_of_delivery: ["Ontario"],
      trade_agreements: ["CFTA"], contracting_entity: "City of Toronto",
      notice_url: "", attachment_urls: [],
    },
    setActiveAgent: vi.fn(),
    completeAgent: vi.fn(),
    setProfile: vi.fn(),
    setSelectedTender: vi.fn(),
    ...overrides,
  };
}

describe("ScoutView — API wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  it("fetches tenders from /api/tenders on mount", async () => {
    const tenders = [
      { id: 1, title: "Tender A", reference_number: "REF-1", closing_date: "2026-05-01", status: "Open", procurement_category: "CNST", contracting_entity: "City", regions_of_opportunity: ["Ontario"], regions_of_delivery: ["Ontario"], match_score: 90 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(tenders),
    });

    const { ScoutView } = await import("@/components/views/scout-view");
    await act(async () => {
      render(<ScoutView agent={makeAgentState()} />);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/tenders");
  });

  it("shows loading state before tenders arrive", async () => {
    // Never resolves
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { ScoutView } = await import("@/components/views/scout-view");
    await act(async () => {
      render(<ScoutView agent={makeAgentState()} />);
    });

    expect(screen.getByText("Loading tenders...")).toBeInTheDocument();
  });

  it("shows empty state when no tenders returned", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { ScoutView } = await import("@/components/views/scout-view");
    await act(async () => {
      render(<ScoutView agent={makeAgentState()} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No matching tenders found/)).toBeInTheDocument();
    });
  });

  it("renders chat input that is not disabled", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { ScoutView } = await import("@/components/views/scout-view");
    await act(async () => {
      render(<ScoutView agent={makeAgentState()} />);
    });

    const input = screen.getByPlaceholderText(/Scout/i) || screen.getByRole("textbox");
    expect(input).not.toBeDisabled();
  });
});

describe("ProfileView — API wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  it("POSTs to /api/profile when profile is completed", async () => {
    const savedProfile = { id: 5, company_name: "Acme", province: "Ontario" };
    // Mock all fetch calls: /api/ai returns AI responses, /api/profile returns saved profile
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/profile") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(savedProfile),
        });
      }
      // /api/ai — return a chat response, and for extraction return valid JSON
      const body = opts?.body ? JSON.parse(opts.body) : {};
      const lastMsg = body.messages?.[body.messages.length - 1];
      if (lastMsg?.content?.includes("Extract the company profile")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: JSON.stringify({ company_name: "Acme Corp", naics_codes: [], location: "Ontario", province: "Ontario", capabilities: "Plumbing, pipes", keywords: ["plumbing"] }),
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ content: "Got it. Next question?" }),
      });
    });

    const agent = makeAgentState({
      activeAgent: "profile",
      statuses: { profile: "active", scout: "locked", analyst: "locked", compliance: "locked", writer: "locked" },
      profile: null,
    });

    const { ProfileView } = await import("@/components/views/profile-view");
    await act(async () => {
      render(<ProfileView agent={agent} />);
    });

    // Answer all 5 questions
    const answers = ["Acme Corp", "Ontario", "Plumbing, pipes", "500K-2M, WSIB", "yes"];
    for (const answer of answers) {
      const input = screen.getByRole("textbox");
      await act(async () => {
        fireEvent.change(input, { target: { value: answer } });
        fireEvent.keyDown(input, { key: "Enter" });
      });
      // Advance timers for setTimeout delays
      await act(async () => {
        vi.advanceTimersByTime(700);
      });
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/profile", expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }));
    });
  });

  it("falls back to local profile when API fails", async () => {
    let callCount = 0;
    // First 4 AI calls succeed (chat messages), 5th (extractAndSaveProfile) also succeeds
    // but /api/profile POST fails
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/profile") {
        return Promise.reject(new Error("Network error"));
      }
      // /api/ai calls
      callCount++;
      const body = opts?.body ? JSON.parse(opts.body) : {};
      const lastMsg = body.messages?.[body.messages.length - 1];
      if (lastMsg?.content?.includes("Extract the company profile")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: JSON.stringify({ company_name: "Acme Corp", naics_codes: [], location: "Ontario", province: "Ontario", capabilities: "Plumbing", keywords: ["plumbing"] }),
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ content: "Got it. Next question?" }),
      });
    });

    const agent = makeAgentState({
      activeAgent: "profile",
      statuses: { profile: "active", scout: "locked", analyst: "locked", compliance: "locked", writer: "locked" },
      profile: null,
    });

    const { ProfileView } = await import("@/components/views/profile-view");
    await act(async () => {
      render(<ProfileView agent={agent} />);
    });

    const answers = ["Acme Corp", "Ontario", "Plumbing", "500K, WSIB", "yes"];
    for (const answer of answers) {
      const input = screen.getByRole("textbox");
      await act(async () => {
        fireEvent.change(input, { target: { value: answer } });
        fireEvent.keyDown(input, { key: "Enter" });
      });
      await act(async () => {
        vi.advanceTimersByTime(700);
      });
    }

    await waitFor(() => {
      // Should still call setProfile with fallback (id: 0)
      expect(agent.setProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 0, company_name: "Acme Corp" })
      );
    });
  });
});

describe("AnalystView — chat wiring", () => {
  it("renders chat input that is not disabled", async () => {
    const { AnalystView } = await import("@/components/views/analyst-view");
    await act(async () => {
      render(<AnalystView agent={makeAgentState({ activeAgent: "analyst" })} />);
    });

    // Chat input should exist and not be disabled
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs[0]).not.toBeDisabled();
  });
});

describe("ComplianceView — chat wiring", () => {
  it("renders chat input that is not disabled", async () => {
    const { ComplianceView } = await import("@/components/views/compliance-view");
    await act(async () => {
      render(<ComplianceView agent={makeAgentState({ activeAgent: "compliance" })} />);
    });

    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs[0]).not.toBeDisabled();
  });
});

describe("WriterView — chat wiring", () => {
  it("renders chat input that is not disabled", async () => {
    const { WriterView } = await import("@/components/views/writer-view");
    await act(async () => {
      render(<WriterView agent={makeAgentState({ activeAgent: "writer" })} />);
    });

    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs[0]).not.toBeDisabled();
  });
});
