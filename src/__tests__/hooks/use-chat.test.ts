import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "@/hooks/use-chat";

function mockSSEResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

describe("useChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("adds user message immediately on sendMessage", async () => {
    (global.fetch as any).mockResolvedValue(mockSSEResponse(['data: {"text":"Hi"}\n\n', "data: [DONE]\n\n"]));
    const { result } = renderHook(() => useChat("profile", 1));
    await act(async () => { await result.current.sendMessage("Hello"); });
    expect(result.current.messages[0]).toMatchObject({ role: "user", content: "Hello" });
  });

  it("streams assistant response token by token", async () => {
    (global.fetch as any).mockResolvedValue(mockSSEResponse(['data: {"text":"Hello "}\n\n', 'data: {"text":"world"}\n\n', "data: [DONE]\n\n"]));
    const { result } = renderHook(() => useChat("profile", 1));
    await act(async () => { await result.current.sendMessage("Hi"); });
    const assistantMsg = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMsg!.content).toBe("Hello world");
  });

  it("sets isStreaming false after completion", async () => {
    (global.fetch as any).mockResolvedValue(mockSSEResponse(['data: {"text":"OK"}\n\n', "data: [DONE]\n\n"]));
    const { result } = renderHook(() => useChat("profile", 1));
    await act(async () => { await result.current.sendMessage("Test"); });
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("sets error on non-ok response", async () => {
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ error: "fail" }), { status: 500 }));
    const { result } = renderHook(() => useChat("profile", 1));
    await act(async () => { await result.current.sendMessage("Test"); });
    expect(result.current.error).toBe("AI request failed: 500");
  });

  it("handles SSE error events gracefully", async () => {
    (global.fetch as any).mockResolvedValue(mockSSEResponse(['data: {"text":"Partial "}\n\n', 'data: {"error":"Stream interrupted"}\n\n', "data: [DONE]\n\n"]));
    const { result } = renderHook(() => useChat("profile", 1));
    await act(async () => { await result.current.sendMessage("Test"); });
    expect(result.current.error).toBe("Stream interrupted");
  });

  it("sends agentId, profileId, and tenderId in request body", async () => {
    (global.fetch as any).mockResolvedValue(mockSSEResponse(['data: {"text":"OK"}\n\n', "data: [DONE]\n\n"]));
    const { result } = renderHook(() => useChat("analyst", 5, 42));
    await act(async () => { await result.current.sendMessage("Analyze"); });
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.agentId).toBe("analyst");
    expect(body.profileId).toBe(5);
    expect(body.tenderId).toBe(42);
  });

  it("addInitialMessage still works without streaming", () => {
    const { result } = renderHook(() => useChat("profile", 1));
    act(() => { result.current.addInitialMessage("Welcome!"); });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Welcome!");
  });
});
