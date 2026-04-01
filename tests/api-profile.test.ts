import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing routes
const mockSingle = vi.fn();
const mockLimit = vi.fn(() => ({ single: mockSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockSelectEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ order: mockOrder, eq: mockSelectEq, single: mockSingle }));
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

function makeGetRequest(id?: number) {
  const url = id
    ? `http://localhost/api/profile?id=${id}`
    : "http://localhost/api/profile";
  const req = new Request(url, { method: "GET" });
  // Mimic NextRequest.nextUrl for route handler
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("GET /api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the first profile on success", async () => {
    const profile = { id: 1, company_name: "Test Co" };
    mockSingle.mockResolvedValue({ data: profile, error: null });

    const res = await GET(makeGetRequest() as any);
    const json = await res.json();

    expect(json).toEqual(profile);
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith("business_profiles");
  });

  it("returns profile by id when query param provided", async () => {
    const profile = { id: 42, company_name: "Specific Co" };
    mockSingle.mockResolvedValue({ data: profile, error: null });

    const res = await GET(makeGetRequest(42) as any);
    const json = await res.json();

    expect(json).toEqual(profile);
    expect(res.status).toBe(200);
    expect(mockSelectEq).toHaveBeenCalledWith("id", 42);
  });

  it("returns 404 when no profile exists", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });

    const res = await GET(makeGetRequest() as any);
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

  it("returns 400 on malformed JSON body", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON body");
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

  it("returns 400 when id is missing from body", async () => {
    const res = await PUT(makeRequest({ company_name: "No ID" }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("id is required");
  });

  it("returns 400 on malformed JSON body", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await PUT(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON body");
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
