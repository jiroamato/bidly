import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockEqTender = vi.fn(() => ({ single: mockSingle }));
const mockEqProfile = vi.fn(() => ({ eq: mockEqTender }));
const mockSelect = vi.fn(() => ({ eq: mockEqProfile }));
const mockUpsert = vi.fn((..._args: unknown[]) => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockFrom = vi.fn(() => ({ select: mockSelect, upsert: mockUpsert }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { GET, POST } = await import("../src/app/api/drafts/route");

function makeGetRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/drafts");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/drafts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when profile_id is missing", async () => {
    const res = await GET(makeGetRequest({ tender_id: "1" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tender_id is missing", async () => {
    const res = await GET(makeGetRequest({ profile_id: "1" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns draft when found", async () => {
    const draft = { id: 1, sections: { exec_summary: "test" }, status: "draft" };
    mockSingle.mockResolvedValue({ data: draft, error: null });

    const res = await GET(makeGetRequest({ profile_id: "1", tender_id: "2" }) as any);
    const json = await res.json();
    expect(json).toEqual(draft);
  });

  it("returns null when no draft exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "No rows" } });

    const res = await GET(makeGetRequest({ profile_id: "1", tender_id: "2" }) as any);
    const json = await res.json();
    expect(json).toBeNull();
  });
});

describe("POST /api/drafts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts draft with updated_at timestamp", async () => {
    const saved = { id: 1, status: "draft" };
    mockSingle.mockResolvedValue({ data: saved, error: null });

    const body = { profile_id: 1, tender_id: 2, sections: {} };
    const res = await POST(makePostRequest(body) as any);
    const json = await res.json();

    expect(json).toEqual(saved);
    // Verify upsert was called with updated_at added
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.updated_at).toBeDefined();
    expect(upsertArg.profile_id).toBe(1);
    expect(mockUpsert.mock.calls[0][1]).toEqual({ onConflict: "profile_id,tender_id" });
  });

  it("returns 400 on upsert error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "constraint violation" },
    });

    const res = await POST(makePostRequest({ profile_id: 1, tender_id: 2 }) as any);
    expect(res.status).toBe(400);
  });
});
