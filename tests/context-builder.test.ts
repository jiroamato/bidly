import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn((_table?: string) => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

// Use top-level await for dynamic import after mocks are set up
const { buildAgentContext, formatContextForPrompt } = await import("@/lib/ai/context-builder");

const mockProfile = {
  id: 1,
  company_name: "Test Co",
  province: "Saskatchewan",
  capabilities: "Janitorial",
  keywords: ["cleaning"],
  keyword_synonyms: { cleaning: ["janitorial", "custodial"] },
  embedding: null,
  insurance_amount: "$2M",
  bonding_limit: 500000,
  certifications: ["WSIB"],
  is_canadian: true,
  naics_codes: ["561720"],
  location: "Saskatoon",
  years_in_business: 5,
  past_gov_experience: "RCMP detachments",
  pbn: "PBN-123",
  security_clearance: "Reliability",
  project_size_min: 50000,
  project_size_max: 500000,
  created_at: "2026-01-01",
};

const mockTender = {
  id: 10,
  title: "Janitorial Services",
  description: "Cleaning for federal buildings",
  solicitation_number: "SOL-001",
  publication_date: "2026-01-01",
  notice_type: "RFP",
  procurement_method: "Competitive",
  selection_criteria: "",
  gsin_codes: [],
  unspsc_codes: [],
  regions_of_opportunity: ["Saskatchewan"],
  regions_of_delivery: ["Saskatchewan"],
  trade_agreements: ["CFTA"],
  reference_number: "REF-001",
  contracting_entity: "PWGSC",
  closing_date: "2026-04-15",
  procurement_category: "SRV",
  status: "Open",
  notice_url: "",
  attachment_urls: [],
};

const mockSelection = {
  id: 1,
  profile_id: 1,
  tender_id: 10,
  match_score: 85,
  matched_keywords: ["janitorial"],
  match_reasoning: "Strong fit",
  created_at: "2026-01-01T00:00:00Z",
};

const mockAnalysis = {
  analysis: {
    whatTheyWant: ["Cleaning services"],
    deadlines: [],
    forms: [],
    evaluation: [],
    risks: [],
  },
};

describe("buildAgentContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty context for profile agent", async () => {
    const ctx = await buildAgentContext("profile", 1);
    expect(ctx).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("fetches profile for scout agent", async () => {
    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    const ctx = await buildAgentContext("scout", 1);

    expect(mockFrom).toHaveBeenCalledWith("business_profiles");
    expect(ctx.profile).toEqual(mockProfile);
    expect(ctx.tender).toBeUndefined();
  });

  it("fetches profile + tender + selection for analyst agent", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "business_profiles") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) };
      if (table === "tenders") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) };
      if (table === "tender_selections") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) })) };
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) };
    });

    mockSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: mockTender, error: null })
      .mockResolvedValueOnce({ data: mockSelection, error: null });

    const ctx = await buildAgentContext("analyst", 1, 10);

    expect(ctx.profile).toBeDefined();
    expect(ctx.tender).toBeDefined();
    expect(ctx.matchContext).toBeDefined();
  });

  it("returns null profile when not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const ctx = await buildAgentContext("scout", 999);
    expect(ctx.profile).toBeNull();
  });

  it("scout does not require tenderId", async () => {
    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    const ctx = await buildAgentContext("scout", 1);
    expect(ctx.tender).toBeUndefined();
    expect(ctx.profile).toEqual(mockProfile);
  });

  it("writer fetches all upstream context", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ single: mockSingle })),
          single: mockSingle,
        })),
      })),
    }));

    mockSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: mockTender, error: null })
      .mockResolvedValueOnce({ data: mockAnalysis, error: null })
      .mockResolvedValueOnce({ data: { result: "pass", explanation: "All clear" }, error: null });

    const ctx = await buildAgentContext("writer", 1, 10);

    expect(ctx.profile).toBeDefined();
    expect(ctx.tender).toBeDefined();
    expect(ctx.analysis).toBeDefined();
    expect(ctx.compliance).toBeDefined();
  });
});

describe("formatContextForPrompt", () => {
  it("formats profile context into readable string", () => {
    const result = formatContextForPrompt({ profile: mockProfile });
    expect(result).toContain("Test Co");
    expect(result).toContain("Saskatchewan");
    expect(result).toContain("Janitorial");
  });

  it("returns empty string for empty context", () => {
    const result = formatContextForPrompt({});
    expect(result).toBe("");
  });

  it("includes tender when present", () => {
    const result = formatContextForPrompt({ profile: mockProfile, tender: mockTender });
    expect(result).toContain("Janitorial Services");
    expect(result).toContain("REF-001");
  });

  it("includes match context when present", () => {
    const result = formatContextForPrompt({
      profile: mockProfile,
      tender: mockTender,
      matchContext: mockSelection,
    });
    expect(result).toContain("85");
    expect(result).toContain("Strong fit");
  });
});
