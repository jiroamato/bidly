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

// Mock ChatHistoryContext used by ChatPanel and views
vi.mock("@/contexts/chat-history-context", () => ({
  useChatHistory: () => [[], vi.fn()],
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

/** Build a fake SSE Response from a plain text string */
function makeSSEResponse(text: string) {
  const encoder = new TextEncoder();
  const chunks = [];
  for (let i = 0; i < text.length; i += 4) {
    chunks.push(`data: ${JSON.stringify({ text: text.slice(i, i + 4) })}\n\n`);
  }
  chunks.push("data: [DONE]\n\n");
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return { ok: true, body, headers: new Headers({ "Content-Type": "text/event-stream" }) };
}

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
      keywords: ["plumbing"], keyword_synonyms: {}, embedding: null,
      insurance_amount: "$1M", bonding_limit: 100000, certifications: [],
      years_in_business: 5, past_gov_experience: "", pbn: "",
      is_canadian: true, security_clearance: "", project_size_min: null,
      project_size_max: null, created_at: "2026-01-01",
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
    profileId: 1,
    tenderId: null,
    setActiveAgent: vi.fn(),
    completeAgent: vi.fn(),
    setProfile: vi.fn(),
    setSelectedTender: vi.fn(),
    resetDemo: vi.fn(),
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

    expect(mockFetch).toHaveBeenCalledWith("/api/tenders/match?profileId=1");
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

  it("extracts and POSTs profile for new users when completed", async () => {
    const savedProfile = { id: 5, company_name: "Acme Corp", province: "Ontario" };
    // New user: profile is null, so extraction via Claude is used
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/profile" && opts?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(savedProfile),
        });
      }
      // /api/ai calls — extraction returns JSON, chat returns SSE
      const body = opts?.body ? JSON.parse(opts.body) : {};
      const lastMsg = body.messages?.[body.messages.length - 1];
      if (lastMsg?.content?.includes("Extract the company profile")) {
        const profileJson = JSON.stringify({ company_name: "Acme Corp", naics_codes: [], location: "Ontario", province: "Ontario", capabilities: "Plumbing, pipes", keywords: ["plumbing"] });
        return Promise.resolve(makeSSEResponse(profileJson));
      }
      return Promise.resolve(makeSSEResponse("Got it. Next question?"));
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

    const answers = ["Acme Corp", "Ontario", "Plumbing, pipes", "500K-2M, WSIB"];
    let answerCount = 0;
    const originalImpl = mockFetch.getMockImplementation()!;
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/profile" && opts?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(savedProfile),
        });
      }
      const body = opts?.body ? JSON.parse(opts.body) : {};
      const lastMsg = body.messages?.[body.messages.length - 1];
      if (url === "/api/ai" && lastMsg?.content?.includes("Extract the company profile")) {
        const profileJson = JSON.stringify({ company_name: "Acme Corp", naics_codes: [], location: "Ontario", province: "Ontario", capabilities: "Plumbing, pipes", keywords: ["plumbing"] });
        return Promise.resolve(makeSSEResponse(profileJson));
      }
      if (url === "/api/ai") {
        answerCount++;
        if (answerCount >= answers.length) {
          return Promise.resolve(makeSSEResponse("Profile looks complete! PROFILE_COMPLETE"));
        }
      }
      return originalImpl(url, opts);
    });
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
      // New user: should extract via Claude then POST to /api/profile
      expect(mockFetch).toHaveBeenCalledWith("/api/profile", expect.objectContaining({
        method: "POST",
      }));
      expect(agent.setProfile).toHaveBeenCalledWith(savedProfile);
    });
  });

  it("falls back to extraction when GET /api/profile fails", async () => {
    // GET /api/profile fails, forcing fallback to Claude extraction
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/profile" && (!opts || !opts.method || opts.method === "GET")) {
        return Promise.reject(new Error("Network error"));
      }
      if (url === "/api/profile" && opts?.method === "POST") {
        return Promise.reject(new Error("Network error"));
      }
      // /api/ai calls — return SSE responses; extraction returns JSON
      const body = opts?.body ? JSON.parse(opts.body) : {};
      const lastMsg = body.messages?.[body.messages.length - 1];
      if (lastMsg?.content?.includes("Extract the company profile")) {
        const profileJson = JSON.stringify({ company_name: "Acme Corp", naics_codes: [], location: "Ontario", province: "Ontario", capabilities: "Plumbing", keywords: ["plumbing"] });
        return Promise.resolve(makeSSEResponse(profileJson));
      }
      return Promise.resolve(makeSSEResponse("Got it. Next question?"));
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

    const answers = ["Acme Corp", "Ontario", "Plumbing", "500K, WSIB"];
    let answerCount2 = 0;
    const originalImpl2 = mockFetch.getMockImplementation()!;
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/profile" && (!opts || !opts.method || opts.method === "GET")) {
        return Promise.reject(new Error("Network error"));
      }
      if (url === "/api/profile" && opts?.method === "POST") {
        return Promise.reject(new Error("Network error"));
      }
      if (url === "/api/ai") {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        const lastMsg = body.messages?.[body.messages.length - 1];
        if (lastMsg?.content?.includes("Extract the company profile")) {
          const profileJson = JSON.stringify({ company_name: "Acme Corp", naics_codes: [], location: "Ontario", province: "Ontario", capabilities: "Plumbing", keywords: ["plumbing"] });
          return Promise.resolve(makeSSEResponse(profileJson));
        }
        answerCount2++;
        if (answerCount2 >= answers.length) {
          return Promise.resolve(makeSSEResponse("Profile complete! PROFILE_COMPLETE"));
        }
      }
      return originalImpl2(url, opts);
    });
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
    // Mock fetch to return analysis data so the component exits loading state
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        analysis: {
          whatTheyWant: ["Item A"],
          deadlines: [],
          forms: [],
          evaluation: [],
          risks: [],
        },
      }),
    });

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
