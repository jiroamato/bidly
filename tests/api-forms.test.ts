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

const { GET, POST } = await import("../src/app/api/forms/route");

function makeGetRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/forms");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/forms", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when profile_id is missing", async () => {
    const res = await GET(makeGetRequest({ tender_id: "1" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tender_id is missing", async () => {
    const res = await GET(makeGetRequest({ profile_id: "1" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when both params are missing", async () => {
    const res = await GET(makeGetRequest({}) as any);
    expect(res.status).toBe(400);
  });

  it("returns form checklist when found", async () => {
    const checklist = { id: 1, forms: [{ name: "Form A", status: "not_started" }], progress_pct: 0 };
    mockSingle.mockResolvedValue({ data: checklist, error: null });

    const res = await GET(makeGetRequest({ profile_id: "1", tender_id: "2" }) as any);
    const json = await res.json();
    expect(json).toEqual(checklist);
  });

  it("returns null when no checklist exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "No rows" } });

    const res = await GET(makeGetRequest({ profile_id: "1", tender_id: "2" }) as any);
    const json = await res.json();
    expect(json).toBeNull();
  });
});

describe("POST /api/forms", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts form checklist", async () => {
    const saved = { id: 1, progress_pct: 50 };
    mockSingle.mockResolvedValue({ data: saved, error: null });

    const body = { profile_id: 1, tender_id: 2, forms: [], progress_pct: 50 };
    const res = await POST(makePostRequest(body) as any);
    const json = await res.json();

    expect(json).toEqual(saved);
    expect(mockUpsert).toHaveBeenCalledWith(body, { onConflict: "profile_id,tender_id" });
  });

  it("returns 400 on upsert error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "invalid json" },
    });

    const res = await POST(makePostRequest({ profile_id: 1, tender_id: 2 }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid json");
  });
});
