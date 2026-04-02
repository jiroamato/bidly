import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

// Mock Anthropic (required by the module even though GET doesn't use it)
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() };
  },
}));

const { GET } = await import("@/app/api/analyze-tender/route");

function makeGetRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/analyze-tender");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString(), { method: "GET" });
}

describe("GET /api/analyze-tender", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cached analysis when found in Supabase", async () => {
    const cachedAnalysis = {
      whatTheyWant: ["Cached item"],
      deadlines: [],
      forms: [],
      evaluation: [],
      risks: [],
    };
    mockSingle.mockResolvedValueOnce({
      data: { analysis: cachedAnalysis },
      error: null,
    });

    const res = await GET(makeGetRequest({ profile_id: "1", tender_id: "10" }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.analysis).toEqual(cachedAnalysis);
    expect(mockFrom).toHaveBeenCalledWith("tender_analyses");
  });

  it("returns 404 when no cached analysis exists", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await GET(makeGetRequest({ profile_id: "1", tender_id: "10" }) as any);

    expect(res.status).toBe(404);
  });

  it("returns 400 when profile_id is missing", async () => {
    const res = await GET(makeGetRequest({ tender_id: "10" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tender_id is missing", async () => {
    const res = await GET(makeGetRequest({ profile_id: "1" }) as any);
    expect(res.status).toBe(400);
  });
});
