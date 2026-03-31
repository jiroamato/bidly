import { describe, it, expect, vi, beforeEach } from "vitest";

// Separate mock functions so we can inspect calls
const mockCreate = vi.fn();
const mockStream = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
        stream: mockStream,
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

const mockHandleToolCall = vi.fn();
vi.mock("@/lib/ai/tool-handlers", () => ({
  handleToolCall: mockHandleToolCall,
}));

const { POST } = await import("@/app/api/ai/route");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Collect all SSE text chunks from a Response into a single string */
async function collectSSE(res: Response): Promise<{ text: string; error?: string }> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let error: string | undefined;
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
          if (parsed.error) error = parsed.error;
        } catch { /* skip */ }
      }
    }
  }
  return { text: fullText, error };
}

describe("POST /api/ai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: stream returns text with no tool use
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hello " } };
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "from Claude" } };
        yield { type: "message_stop" };
      },
      finalMessage: vi.fn().mockResolvedValue({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Hello from Claude" }],
      }),
    });
  });

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

  it("streams directly from initial .stream() when no tool use", async () => {
    const res = await POST(
      makeRequest({
        agentId: "profile",
        messages: [{ role: "user", content: "Hello", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const { text } = await collectSSE(res);
    expect(text).toBe("Hello from Claude");

    // Only .stream() called — no .create() needed
    expect(mockStream).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("uses .stream() for initial call then .create() for tool loop", async () => {
    // Initial .stream() returns tool_use
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "Let me check." } };
        yield { type: "message_stop" };
      },
      finalMessage: vi.fn().mockResolvedValue({
        stop_reason: "tool_use",
        content: [
          { type: "text", text: "Let me check." },
          { type: "tool_use", id: "tool_1", name: "search_tenders", input: { query: "test" } },
        ],
      }),
    });

    // .create() in tool loop returns final text
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Here are the results." }],
    });

    mockHandleToolCall.mockResolvedValue("tool result data");

    const res = await POST(
      makeRequest({
        agentId: "scout",
        messages: [{ role: "user", content: "Search tenders", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);

    const { text } = await collectSSE(res);
    // Should contain initial streamed text + final tool loop text
    expect(text).toContain("Let me check.");
    expect(text).toContain("Here are the results.");

    // .stream() called once for initial, .create() once for tool loop
    expect(mockStream).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("returns error event when max tool iterations exceeded", async () => {
    // Initial stream returns tool_use
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: "message_stop" };
      },
      finalMessage: vi.fn().mockResolvedValue({
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "tool_1", name: "search_tenders", input: { query: "test" } },
        ],
      }),
    });

    // Every .create() returns tool_use to trigger the limit
    mockCreate.mockResolvedValue({
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "tool_1", name: "search_tenders", input: { query: "test" } },
      ],
    });
    mockHandleToolCall.mockResolvedValue("result");

    const res = await POST(
      makeRequest({
        agentId: "scout",
        messages: [{ role: "user", content: "Loop forever", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);
    const { error } = await collectSSE(res);
    expect(error).toMatch(/too many tool iterations/i);
  });

  it("sends error event in SSE when streaming fails", async () => {
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        throw new Error("Stream connection lost");
      },
      finalMessage: vi.fn().mockRejectedValue(new Error("Stream connection lost")),
    });

    const res = await POST(
      makeRequest({
        agentId: "scout",
        messages: [{ role: "user", content: "Hello", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);
    const { error } = await collectSSE(res);
    expect(error).toBe("Stream connection lost");
  });
});
