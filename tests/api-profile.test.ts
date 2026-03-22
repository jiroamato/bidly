import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing routes
const mockSingle = vi.fn();
const mockLimit = vi.fn(() => ({ single: mockSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ order: mockOrder, single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockEq = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

// Must import AFTER mocking
const { GET, POST, PUT } = await import("../src/app/api/profile/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the first profile on success", async () => {
    const profile = { id: 1, company_name: "Test Co" };
    mockSingle.mockResolvedValue({ data: profile, error: null });

    const res = await GET();
    const json = await res.json();

    expect(json).toEqual(profile);
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith("business_profiles");
  });

  it("returns 404 when no profile exists", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("No rows found");
  });
});

describe("POST /api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a profile and returns it", async () => {
    const created = { id: 1, company_name: "New Co" };
    mockSingle.mockResolvedValue({ data: created, error: null });

    const res = await POST(makeRequest({ company_name: "New Co" }) as any);
    const json = await res.json();

    expect(json).toEqual(created);
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith({ company_name: "New Co" });
  });

  it("returns 400 on insert error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "duplicate key" },
    });

    const res = await POST(makeRequest({ company_name: "Dup" }) as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("duplicate key");
  });
});

describe("PUT /api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates a profile by id", async () => {
    const updated = { id: 1, company_name: "Updated Co" };
    mockSingle.mockResolvedValue({ data: updated, error: null });

    const res = await PUT(makeRequest({ id: 1, company_name: "Updated Co" }) as any);
    const json = await res.json();

    expect(json).toEqual(updated);
    expect(mockUpdate).toHaveBeenCalledWith({ company_name: "Updated Co" });
    expect(mockEq).toHaveBeenCalledWith("id", 1);
  });

  it("returns 400 on update error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const res = await PUT(makeRequest({ id: 999, company_name: "X" }) as any);
    expect(res.status).toBe(400);
  });
});
