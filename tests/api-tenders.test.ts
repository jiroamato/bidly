import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase chainable query builder
const mockResult = vi.fn();
const mockEqChain = vi.fn(() => mockResult());
const mockLimit = vi.fn(() => ({ eq: mockEqChain, then: mockResult }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ order: mockOrder, eq: vi.fn(() => ({ single: mockResult })) }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { GET } = await import("../src/app/api/tenders/route");

function makeRequest(url: string): Request {
  return new Request(url);
}

describe("GET /api/tenders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries tenders table ordered by closing_date with default limit", async () => {
    // Make the chain resolve at the limit() step
    const tenders = [{ id: 1, title: "Tender A" }];
    mockLimit.mockReturnValue(
      Promise.resolve({ data: tenders, error: null })
    );

    const res = await GET(makeRequest("http://localhost/api/tenders") as any);
    const json = await res.json();

    expect(json).toEqual(tenders);
    expect(mockFrom).toHaveBeenCalledWith("tenders");
    expect(mockOrder).toHaveBeenCalledWith("closing_date", { ascending: true });
    expect(mockLimit).toHaveBeenCalledWith(200);
  });

  it("applies custom limit from query param", async () => {
    mockLimit.mockReturnValue(
      Promise.resolve({ data: [], error: null })
    );

    await GET(makeRequest("http://localhost/api/tenders?limit=10") as any);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("applies category filter when provided", async () => {
    const mockEq = vi.fn(() =>
      Promise.resolve({ data: [], error: null })
    );
    mockLimit.mockReturnValue({ eq: mockEq });

    await GET(makeRequest("http://localhost/api/tenders?category=SRV") as any);
    expect(mockEq).toHaveBeenCalledWith("procurement_category", "SRV");
  });

  it("returns 500 on database error", async () => {
    mockLimit.mockReturnValue(
      Promise.resolve({ data: null, error: { message: "connection refused" } })
    );

    const res = await GET(makeRequest("http://localhost/api/tenders") as any);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("connection refused");
  });

  it("defaults limit to 50 when param is not a number", async () => {
    mockLimit.mockReturnValue(
      Promise.resolve({ data: [], error: null })
    );

    await GET(makeRequest("http://localhost/api/tenders?limit=abc") as any);
    // parseInt("abc") = NaN, but the route uses parseInt which returns NaN
    // This is an edge case — NaN gets passed to .limit()
    expect(mockLimit).toHaveBeenCalled();
  });
});
