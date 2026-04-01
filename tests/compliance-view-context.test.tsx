import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

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
    activeAgent: "compliance" as const,
    statuses: { profile: "completed" as const, scout: "completed" as const, analyst: "completed" as const, compliance: "active" as const, writer: "locked" as const },
    profile: { id: 1, company_name: "Test", naics_codes: [], location: "", province: "Ontario", capabilities: "", keywords: [], keyword_synonyms: {}, embedding: null, insurance_amount: "", bonding_limit: null, certifications: [], years_in_business: null, past_gov_experience: "", pbn: "", is_canadian: true, security_clearance: "", project_size_min: null, project_size_max: null, created_at: "" },
    profileId: 1,
    selectedTender: { id: 42, reference_number: "REF-1", solicitation_number: "SOL-1", title: "Test Tender", description: "", publication_date: "", closing_date: "2026-05-01", status: "Open", procurement_category: "CNST", notice_type: "", procurement_method: "", selection_criteria: "", gsin_codes: [], unspsc_codes: [], regions_of_opportunity: [], regions_of_delivery: [], trade_agreements: [], contracting_entity: "DND", notice_url: "", attachment_urls: [] },
    tenderId: 42,
    setActiveAgent: vi.fn(),
    completeAgent: vi.fn(),
    setProfile: vi.fn(),
    setSelectedTender: vi.fn(),
    resetDemo: vi.fn(),
    ...overrides,
  };
}

describe("ComplianceView context integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [];
  });

  it("seeds initial message when context messages are empty", async () => {
    const { ComplianceView } = await import("@/components/views/compliance-view");
    await act(async () => {
      render(<ComplianceView agent={makeAgentState()} />);
    });

    expect(mockSetMessages).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: "assistant", content: expect.stringContaining("eligibility") }),
      ]),
    );
  });

  it("does not re-seed when context already has messages", async () => {
    mockMessages = [{ role: "user", content: "existing", timestamp: 1 }];

    const { ComplianceView } = await import("@/components/views/compliance-view");
    await act(async () => {
      render(<ComplianceView agent={makeAgentState()} />);
    });

    const seedCalls = mockSetMessages.mock.calls.filter((call: any[]) => {
      const arg = call[0];
      if (Array.isArray(arg) && arg.length === 1 && arg[0].content?.includes("eligibility")) return true;
      return false;
    });
    expect(seedCalls).toHaveLength(0);
  });
});
