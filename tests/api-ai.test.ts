import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          stop_reason: "end_turn",
          content: [{ type: "text", text: "Hello from Claude" }],
        }),
      };
    },
  };
});

const mockBuildAgentContext = vi.fn().mockResolvedValue({ profile: { company_name: "Test" } });
const mockFormatContextForPrompt = vi.fn().mockReturnValue("COMPANY PROFILE:\nCompany: Test");

vi.mock("@/lib/ai/context-builder", () => ({
  buildAgentContext: mockBuildAgentContext,
  formatContextForPrompt: mockFormatContextForPrompt,
}));

vi.mock("@/lib/ai/tools", () => ({ TOOL_DEFINITIONS: [] }));
vi.mock("@/lib/ai/prompts", () => ({
  getSystemPrompt: vi.fn().mockReturnValue("You are Bidly"),
  AGENT_TOOLS: { scout: [], profile: [], analyst: [], compliance: [], writer: [] },
}));
vi.mock("@/lib/ai/tool-handlers", () => ({
  handleToolCall: vi.fn(),
}));

const { POST } = await import("@/app/api/ai/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts profileId and tenderId instead of profileContext", async () => {
    const res = await POST(
      makeRequest({
        agentId: "scout",
        messages: [{ role: "user", content: "Find tenders", timestamp: 1 }],
        profileId: 1,
        tenderId: 10,
      }) as any
    );

    expect(res.status).toBe(200);
    expect(mockBuildAgentContext).toHaveBeenCalledWith("scout", 1, 10);
    expect(mockFormatContextForPrompt).toHaveBeenCalled();
  });

  it("works without tenderId for profile agent", async () => {
    const res = await POST(
      makeRequest({
        agentId: "profile",
        messages: [{ role: "user", content: "Hello", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);
    expect(mockBuildAgentContext).toHaveBeenCalledWith("profile", 1, undefined);
  });

  it("returns 200 with SSE-streamed content", async () => {
    const res = await POST(
      makeRequest({
        agentId: "scout",
        messages: [{ role: "user", content: "Hello", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    // Collect SSE chunks
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.done) break;
      const chunk = decoder.decode(result.value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) fullText += parsed.text;
          } catch { /* skip */ }
        }
      }
    }
    expect(fullText).toBe("Hello from Claude");
  });
});
