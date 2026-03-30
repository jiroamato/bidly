import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify({
            overallResult: "eligible",
            overallLabel: "Eligible",
            summaryNote: "All requirements met",
            sections: [{
              title: "Buy Canadian Policy",
              items: [{ name: "Canadian Ownership", description: "Verified", status: "pass", statusLabel: "Verified", action: null }],
            }],
          }),
        }],
      }),
    };
  },
}));

const { POST } = await import("@/app/api/check-compliance/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/check-compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/check-compliance", () => {
  it("returns structured assessment", async () => {
    const res = await POST(makeRequest({
      tender: { id: 1, title: "Test", trade_agreements: ["CFTA"] },
      profile: { id: 1, company_name: "Test Co", is_canadian: true },
      conversation: [{ role: "user", content: "Yes we have $2M insurance" }],
    }) as any);

    const json = await res.json();
    expect(json.assessment.overallResult).toBe("eligible");
    expect(json.assessment.sections).toHaveLength(1);
    expect(json.assessment.sections[0].title).toBe("Buy Canadian Policy");
  });

  it("returns 400 when tender missing", async () => {
    const res = await POST(makeRequest({ profile: { id: 1 } }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when profile missing", async () => {
    const res = await POST(makeRequest({ tender: { id: 1 } }) as any);
    expect(res.status).toBe(400);
  });
});
