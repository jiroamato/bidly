import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

Element.prototype.scrollIntoView = vi.fn();

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

vi.mock("@/contexts/chat-history-context", () => ({
  useChatHistory: () => [[], vi.fn()],
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const fakeAnalysis = {
  whatTheyWant: ["Test requirement"],
  deadlines: [{ label: "Closing", value: "2026-05-01", urgent: false }],
  forms: ["Form A"],
  evaluation: [{ criteria: "Price", weight: "60%" }],
  risks: [{ level: "low" as const, text: "Low risk" }],
};

const fakeTender = {
  id: 42, reference_number: "REF-1", solicitation_number: "SOL-1",
  title: "Test Tender", description: "Test", publication_date: "2026-01-01",
  closing_date: "2026-05-01", status: "Open", procurement_category: "CNST",
  notice_type: "RFP", procurement_method: "Competitive", selection_criteria: "",
  gsin_codes: [], unspsc_codes: [], regions_of_opportunity: ["Ontario"],
  regions_of_delivery: ["Ontario"], trade_agreements: [], contracting_entity: "DND",
  notice_url: "", attachment_urls: [],
};

function makeAgentState(overrides = {}) {
  return {
    activeAgent: "analyst" as const,
    statuses: { profile: "completed" as const, scout: "completed" as const, analyst: "active" as const, compliance: "locked" as const, writer: "locked" as const },
    profile: { id: 1, company_name: "Test", naics_codes: [], location: "", province: "Ontario", capabilities: "", keywords: [], keyword_synonyms: {}, embedding: null, insurance_amount: "", bonding_limit: null, certifications: [], years_in_business: null, past_gov_experience: "", pbn: "", is_canadian: true, security_clearance: "", project_size_min: null, project_size_max: null, created_at: "" },
    profileId: 1,
    selectedTender: fakeTender,
    tenderId: 42,
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

describe("AnalystView cache integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders immediately from in-memory cache without any fetch", async () => {
    const { AnalystView } = await import("@/components/views/analyst-view");
    await act(async () => {
      render(<AnalystView agent={makeAgentState({ tenderAnalysis: fakeAnalysis })} />);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByText("Test requirement")).toBeInTheDocument();
  });

  it("fetches from Supabase GET when no in-memory cache, skips POST", async () => {
    const setTenderAnalysis = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ analysis: fakeAnalysis }),
    });

    const { AnalystView } = await import("@/components/views/analyst-view");
    await act(async () => {
      render(<AnalystView agent={makeAgentState({ setTenderAnalysis })} />);
    });

    await waitFor(() => {
      // Should have called GET, not POST
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/analyze-tender?profile_id=1&tender_id=42"),
      );
      expect(setTenderAnalysis).toHaveBeenCalledWith(fakeAnalysis);
    });
  });

  it("falls back to POST when Supabase GET returns 404", async () => {
    const setTenderAnalysis = vi.fn();
    // First call: GET returns 404
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    // Second call: POST returns analysis
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ analysis: fakeAnalysis }),
    });

    const { AnalystView } = await import("@/components/views/analyst-view");
    await act(async () => {
      render(<AnalystView agent={makeAgentState({ setTenderAnalysis })} />);
    });

    await waitFor(() => {
      // First call should be GET
      expect(mockFetch.mock.calls[0][0]).toContain("/api/analyze-tender?profile_id=");
      // Second call should be POST
      expect(mockFetch.mock.calls[1][0]).toBe("/api/analyze-tender");
      expect(mockFetch.mock.calls[1][1]).toEqual(
        expect.objectContaining({ method: "POST" }),
      );
      expect(setTenderAnalysis).toHaveBeenCalledWith(fakeAnalysis);
    });
  });
});
