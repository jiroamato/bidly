import { describe, it, expect, vi, beforeEach } from "vitest";

// Separate mock functions so we can inspect calls
const mockCreate = vi.fn().mockResolvedValue({
  stop_reason: "end_turn",
  content: [{ type: "text", text: "Hello from Claude" }],
});

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

function makeDefaultStreamMock() {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hello " } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "from Claude" } };
      yield { type: "message_stop" };
    },
    finalMessage: vi.fn().mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Hello from Claude" }],
    }),
  };
}

describe("POST /api/ai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: create returns end_turn so no tool loop
    mockCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Hello from Claude" }],
    });
    // Default stream mock
    mockStream.mockReturnValue(makeDefaultStreamMock());
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

  it("returns 200 with SSE-streamed content from real Anthropic streaming", async () => {
    const res = await POST(
      makeRequest({
        agentId: "scout",
        messages: [{ role: "user", content: "Hello", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const { text } = await collectSSE(res);
    expect(text).toBe("Hello from Claude");

    // Verify .stream() was called for final response
    expect(mockStream).toHaveBeenCalledTimes(1);
  });

  it("uses .create() for tool-use iterations then .stream() for final response", async () => {
    // First create call returns tool_use
    mockCreate.mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [
        { type: "text", text: "Let me look that up." },
        { type: "tool_use", id: "tool_1", name: "search_tenders", input: { query: "test" } },
      ],
    });
    // Second create call returns end_turn (tool loop done)
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Here are the results" }],
    });

    mockHandleToolCall.mockResolvedValue("tool result data");

    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "Here are " } };
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "the results" } };
        yield { type: "message_stop" };
      },
    });

    const res = await POST(
      makeRequest({
        agentId: "scout",
        messages: [{ role: "user", content: "Search tenders", timestamp: 1 }],
        profileId: 1,
      }) as any
    );

    expect(res.status).toBe(200);

    const { text } = await collectSSE(res);
    expect(text).toBe("Here are the results");

    // create() called twice: initial + one tool-loop iteration
    expect(mockCreate).toHaveBeenCalledTimes(2);
    // stream() called once for the final streamed response
    expect(mockStream).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when max tool iterations exceeded", async () => {
    // Every create call returns tool_use to trigger infinite loop
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

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/too many tool iterations/i);
  });

  it("sends error event in SSE when streaming fails", async () => {
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        throw new Error("Stream connection lost");
      },
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
