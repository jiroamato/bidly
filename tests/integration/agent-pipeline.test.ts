import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase with realistic data flow
const mockData: Record<string, any> = {
  business_profiles: {
    id: 1,
    company_name: "Maple Facility Services",
    province: "Saskatchewan",
    capabilities: "Janitorial services for government facilities",
    keywords: ["janitorial", "cleaning", "facility"],
    insurance_amount: "$2M commercial liability",
    bonding_limit: 500000,
    certifications: ["WSIB"],
    is_canadian: true,
    naics_codes: ["561720"],
    years_in_business: 5,
    past_gov_experience: "3 years RCMP detachments",
    pbn: "PBN-12345",
    security_clearance: "Reliability",
    project_size_min: 50000,
    project_size_max: 500000,
    location: "Saskatoon",
    created_at: "2026-01-01",
  },
  tenders: {
    id: 10,
    title: "Janitorial Services for Federal Buildings",
    description: "Cleaning services for 6 RCMP detachments in Saskatchewan",
    regions_of_delivery: ["Saskatchewan"],
    trade_agreements: ["CFTA"],
    reference_number: "REF-001",
    contracting_entity: "PWGSC",
    closing_date: "2026-04-15",
    procurement_category: "SRV",
    status: "Open",
  },
  tender_selections: {
    match_score: 92,
    matched_keywords: ["janitorial", "cleaning", "facility"],
    match_reasoning: "Strong fit — core services match, correct region",
  },
  tender_analyses: {
    analysis: {
      whatTheyWant: ["Janitorial services for 6 RCMP detachments"],
      deadlines: [{ label: "Closing", value: "2026-04-15", urgent: true }],
      forms: ["PWGSC-TPSGC 9200"],
      evaluation: [{ criteria: "Technical", weight: "40%" }],
      risks: [{ level: "low", text: "Strong regional presence" }],
    },
  },
  eligibility_checks: {
    result: "pass",
    explanation: "All compliance requirements met",
    responses: {},
    documentation_checklist: [],
  },
};

const mockSingle = vi.fn();
const mockFrom = vi.fn((table: string) => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({ single: mockSingle })),
      single: mockSingle,
    })),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { buildAgentContext, formatContextForPrompt } = await import("@/lib/ai/context-builder");

describe("Agent Pipeline Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockFrom to use table-based data
    mockFrom.mockImplementation((table: string) => {
      mockSingle.mockResolvedValueOnce({ data: mockData[table] || null, error: null });
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockSingle })),
            single: mockSingle,
          })),
        })),
      };
    });
  });

  it("profile agent gets empty context", async () => {
    const ctx = await buildAgentContext("profile", 1);
    expect(ctx).toEqual({});
  });

  it("scout agent gets profile context", async () => {
    const ctx = await buildAgentContext("scout", 1);
    expect(ctx.profile).toBeDefined();
    expect(ctx.profile!.company_name).toBe("Maple Facility Services");

    const prompt = formatContextForPrompt(ctx);
    expect(prompt).toContain("Maple Facility Services");
    expect(prompt).toContain("Saskatchewan");
  });

  it("writer agent gets full pipeline context", async () => {
    const ctx = await buildAgentContext("writer", 1, 10);

    const prompt = formatContextForPrompt(ctx);
    // Should contain data from all upstream agents
    expect(prompt).toContain("COMPANY PROFILE");
    expect(prompt).toContain("SELECTED TENDER");
  });

  it("formatContextForPrompt returns empty string for empty context", () => {
    const result = formatContextForPrompt({});
    expect(result).toBe("");
  });
});
