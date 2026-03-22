import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { GET } = await import("../src/app/api/tenders/[id]/route");

function makeRequest(): Request {
  return new Request("http://localhost/api/tenders/42");
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/tenders/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a single tender by id", async () => {
    const tender = { id: 42, title: "Test Tender" };
    mockSingle.mockResolvedValue({ data: tender, error: null });

    const res = await GET(makeRequest() as any, makeParams("42"));
    const json = await res.json();

    expect(json).toEqual(tender);
    expect(mockFrom).toHaveBeenCalledWith("tenders");
    expect(mockEq).toHaveBeenCalledWith("id", 42);
  });

  it("returns 404 when tender not found", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Row not found" },
    });

    const res = await GET(makeRequest() as any, makeParams("9999"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Row not found");
  });

  it("parses string id param to integer for query", async () => {
    mockSingle.mockResolvedValue({ data: { id: 7 }, error: null });

    await GET(makeRequest() as any, makeParams("7"));
    expect(mockEq).toHaveBeenCalledWith("id", 7);
  });

  it("returns 400 when id is not numeric", async () => {
    const res = await GET(makeRequest() as any, makeParams("abc"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid tender id");
    // Should not reach Supabase at all
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
