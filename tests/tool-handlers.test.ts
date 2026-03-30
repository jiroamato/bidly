import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockLimit = vi.fn(() => ({ data: [], error: null }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockContains = vi.fn(() => ({ order: mockOrder, limit: mockLimit }));
const mockIlike = vi.fn(() => ({ contains: mockContains, order: mockOrder, limit: mockLimit, ilike: mockIlike }));
const mockGte = vi.fn(() => ({ lte: vi.fn(() => ({ order: mockOrder, limit: mockLimit })), order: mockOrder, limit: mockLimit }));
const mockEq = vi.fn(() => ({
  eq: mockEq,
  single: mockSingle,
  ilike: mockIlike,
  contains: mockContains,
  order: mockOrder,
  limit: mockLimit,
  gte: mockGte,
}));
const mockSelect = vi.fn(() => ({
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  ilike: mockIlike,
  contains: mockContains,
  single: mockSingle,
  gte: mockGte,
}));
const mockUpsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
  update: mockUpdate,
}));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { handleToolCall } = await import("@/lib/ai/tool-handlers");

describe("matchTendersToProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries tenders filtered by province and keywords", async () => {
    mockSingle.mockResolvedValue({
      data: {
        province: "Saskatchewan",
        keywords: ["janitorial", "cleaning"],
      },
      error: null,
    });
    mockLimit.mockReturnValue({ data: [{ id: 1, title: "Test Tender" }], error: null });

    const result = await handleToolCall("matchTendersToProfile", { profile_id: 1, limit: 20 });
    const parsed = JSON.parse(result);

    expect(mockFrom).toHaveBeenCalledWith("business_profiles");
    expect(mockFrom).toHaveBeenCalledWith("tenders");
  });

  it("returns error when profile not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const result = await handleToolCall("matchTendersToProfile", { profile_id: 999 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBeDefined();
  });
});

describe("filterTenders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by category", async () => {
    mockLimit.mockReturnValue({ data: [{ id: 1 }], error: null });

    const result = await handleToolCall("filterTenders", {
      category: "SRV",
      limit: 10,
    });

    expect(mockFrom).toHaveBeenCalledWith("tenders");
  });

  it("returns empty array on no matches", async () => {
    mockLimit.mockReturnValue({ data: [], error: null });

    const result = await handleToolCall("filterTenders", { category: "NOPE" });
    const parsed = JSON.parse(result);

    expect(parsed).toEqual([]);
  });
});

describe("checkBuyCanadian", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns pass for canadian company", async () => {
    const result = await handleToolCall("checkBuyCanadian", {
      is_canadian: true,
      trade_agreements: ["CFTA"],
    });
    const parsed = JSON.parse(result);

    expect(parsed.status).toBe("pass");
  });

  it("returns fail for non-canadian company", async () => {
    const result = await handleToolCall("checkBuyCanadian", {
      is_canadian: false,
      trade_agreements: ["CFTA"],
    });
    const parsed = JSON.parse(result);

    expect(parsed.status).toBe("fail");
    expect(parsed.hard_gate).toBe(true);
  });

  it("returns pending when is_canadian is null/unknown", async () => {
    const result = await handleToolCall("checkBuyCanadian", {
      is_canadian: null,
      trade_agreements: [],
    });
    const parsed = JSON.parse(result);

    expect(parsed.status).toBe("pending");
  });
});

describe("saveTenderSelection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts tender selection", async () => {
    mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    const result = await handleToolCall("saveTenderSelection", {
      profile_id: 1,
      tender_id: 10,
      match_score: 85,
      matched_keywords: ["janitorial"],
      match_reasoning: "Strong fit",
    });
    const parsed = JSON.parse(result);

    expect(mockFrom).toHaveBeenCalledWith("tender_selections");
    expect(mockUpsert).toHaveBeenCalled();
  });
});

describe("saveAnalysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts tender analysis", async () => {
    mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    const result = await handleToolCall("saveAnalysis", {
      profile_id: 1,
      tender_id: 10,
      analysis: { whatTheyWant: ["Test"], deadlines: [], forms: [], evaluation: [], risks: [] },
    });

    expect(mockFrom).toHaveBeenCalledWith("tender_analyses");
    expect(mockUpsert).toHaveBeenCalled();
  });
});

describe("updateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("partially updates profile", async () => {
    mockSingle.mockResolvedValue({
      data: { id: 1, insurance_amount: "$3M" },
      error: null,
    });

    const result = await handleToolCall("updateProfile", {
      profile_id: 1,
      updates: { insurance_amount: "$3M" },
    });
    const parsed = JSON.parse(result);

    expect(mockFrom).toHaveBeenCalledWith("business_profiles");
    expect(mockUpdate).toHaveBeenCalledWith({ insurance_amount: "$3M" });
  });

  it("rejects updates to id field", async () => {
    const result = await handleToolCall("updateProfile", {
      profile_id: 1,
      updates: { id: 999 },
    });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBeDefined();
  });
});

describe("getMatchContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches tender selection for profile+tender", async () => {
    mockSingle.mockResolvedValue({
      data: { match_score: 85, matched_keywords: ["cleaning"] },
      error: null,
    });

    const result = await handleToolCall("getMatchContext", {
      profile_id: 1,
      tender_id: 10,
    });
    const parsed = JSON.parse(result);

    expect(parsed.match_score).toBe(85);
    expect(mockFrom).toHaveBeenCalledWith("tender_selections");
  });

  it("returns error when no selection exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const result = await handleToolCall("getMatchContext", {
      profile_id: 1,
      tender_id: 999,
    });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBeDefined();
  });
});
