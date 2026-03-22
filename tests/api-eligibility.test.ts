import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockEqTender = vi.fn(() => ({ single: mockSingle }));
const mockEqProfile = vi.fn(() => ({ eq: mockEqTender }));
const mockSelect = vi.fn(() => ({ eq: mockEqProfile }));
const mockUpsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockFrom = vi.fn(() => ({ select: mockSelect, upsert: mockUpsert }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { GET, POST } = await import("../src/app/api/eligibility/route");

function makeGetRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/eligibility");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/eligibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/eligibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when profile_id is missing", async () => {
    const res = await GET(makeGetRequest({ tender_id: "1" }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("profile_id");
  });

  it("returns 400 when tender_id is missing", async () => {
    const res = await GET(makeGetRequest({ profile_id: "1" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when both params are missing", async () => {
    const res = await GET(makeGetRequest({}) as any);
    expect(res.status).toBe(400);
  });

  it("returns eligibility check when found", async () => {
    const check = { id: 1, result: "pass" };
    mockSingle.mockResolvedValue({ data: check, error: null });

    const res = await GET(makeGetRequest({ profile_id: "1", tender_id: "2" }) as any);
    const json = await res.json();

    expect(json).toEqual(check);
    expect(mockEqProfile).toHaveBeenCalledWith("profile_id", 1);
    expect(mockEqTender).toHaveBeenCalledWith("tender_id", 2);
  });

  it("returns null when no eligibility check exists", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "No rows" },
    });

    const res = await GET(makeGetRequest({ profile_id: "1", tender_id: "2" }) as any);
    const json = await res.json();
    expect(json).toBeNull();
  });
});

describe("POST /api/eligibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts eligibility check with conflict on profile_id,tender_id", async () => {
    const saved = { id: 1, result: "pass" };
    mockSingle.mockResolvedValue({ data: saved, error: null });

    const body = { profile_id: 1, tender_id: 2, result: "pass" };
    const res = await POST(makePostRequest(body) as any);
    const json = await res.json();

    expect(json).toEqual(saved);
    expect(mockUpsert).toHaveBeenCalledWith(body, { onConflict: "profile_id,tender_id" });
  });

  it("returns 400 on upsert error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "violates foreign key" },
    });

    const res = await POST(makePostRequest({ profile_id: 999, tender_id: 999 }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("violates foreign key");
  });
});
