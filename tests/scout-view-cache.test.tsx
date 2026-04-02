import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

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

function makeAgentState(overrides = {}) {
  return {
    activeAgent: "scout" as const,
    statuses: { profile: "completed" as const, scout: "active" as const, analyst: "locked" as const, compliance: "locked" as const, writer: "locked" as const },
    profile: { id: 1, company_name: "Test", naics_codes: [], location: "", province: "Ontario", capabilities: "Plumbing", keywords: ["plumbing"], keyword_synonyms: {}, embedding: null, insurance_amount: "", bonding_limit: null, certifications: [], years_in_business: null, past_gov_experience: "", pbn: "", is_canadian: true, security_clearance: "", project_size_min: null, project_size_max: null, created_at: "" },
    profileId: 1,
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

describe("ScoutView cache integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips fetch and renders cached tenders when matchedTenders is populated", async () => {
    const cachedTenders = [
      { id: 1, title: "Cached Tender", reference_number: "REF-1", closing_date: "2026-05-01", status: "Open", procurement_category: "CNST", contracting_entity: "City", regions_of_opportunity: ["Ontario"], regions_of_delivery: ["Ontario"], match_score: 85, bm25_score: 0, category_score: 0, synonym_score: 0, location_score: 0, matched_keywords: [], description: "", publication_date: "", notice_type: "", procurement_method: "", selection_criteria: "", gsin_codes: [], unspsc_codes: [], trade_agreements: [], solicitation_number: "", notice_url: "", attachment_urls: [] },
    ];

    const { ScoutView } = await import("@/components/views/scout-view");
    await act(async () => {
      render(<ScoutView agent={makeAgentState({ matchedTenders: cachedTenders })} />);
    });

    // Should NOT have called fetch
    expect(mockFetch).not.toHaveBeenCalled();
    // Should render the cached tender
    expect(screen.getByText("Cached Tender")).toBeInTheDocument();
  });

  it("fetches and caches tenders when matchedTenders is empty", async () => {
    const setMatchedTenders = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: 2, title: "Fresh Tender", reference_number: "REF-2", closing_date: "2026-05-01", match_score: 70, regions_of_delivery: ["Ontario"], contracting_entity: "DND", procurement_category: "CNST", regions_of_opportunity: ["Ontario"] },
      ]),
    });

    const { ScoutView } = await import("@/components/views/scout-view");
    await act(async () => {
      render(<ScoutView agent={makeAgentState({ setMatchedTenders })} />);
    });

    // Should have fetched
    expect(mockFetch).toHaveBeenCalledWith("/api/tenders/match?profileId=1");
    // Should have cached the result
    expect(setMatchedTenders).toHaveBeenCalled();
  });
});
