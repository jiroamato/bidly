import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify({
          whatTheyWant: ["Test"],
          deadlines: [],
          forms: [],
          evaluation: [],
          risks: [{ level: "high", text: "Test risk for profile" }],
        })}],
      }),
    };
  },
}));

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockFrom = vi.fn(() => ({ select: mockSelect, upsert: mockUpsert }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { POST } = await import("@/app/api/analyze-tender/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze-tender", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze-tender", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts profileId and tenderId", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: 1, company_name: "Test" }, error: null })
      .mockResolvedValueOnce({ data: { match_score: 85 }, error: null })
      .mockResolvedValueOnce({ data: { id: 1 }, error: null });

    const res = await POST(makeRequest({
      tender: { id: 10, title: "Test", description: "Test" },
      profileId: 1,
    }) as any);

    expect(res.status).toBe(200);
  });

  it("saves analysis to tender_analyses table", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: 1, company_name: "Test" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 1 }, error: null });

    await POST(makeRequest({
      tender: { id: 10, title: "Test", description: "Test" },
      profileId: 1,
    }) as any);

    expect(mockFrom).toHaveBeenCalledWith("tender_analyses");
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("returns 400 when tender is missing", async () => {
    const res = await POST(makeRequest({ profileId: 1 }) as any);
    expect(res.status).toBe(400);
  });
});
