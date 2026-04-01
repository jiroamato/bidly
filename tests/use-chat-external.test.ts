import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useChat with external state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses externalMessages instead of internal state when provided", async () => {
    const externalMessages = [{ role: "user" as const, content: "hello", timestamp: 1 }];
    const setExternalMessages = vi.fn();

    const { useChat } = await import("@/hooks/use-chat");
    const { result } = renderHook(() =>
      useChat("scout", undefined, undefined, externalMessages, setExternalMessages),
    );

    expect(result.current.messages).toBe(externalMessages);
  });

  it("calls setExternalMessages when sendMessage is called with external state", async () => {
    const externalMessages: any[] = [];
    const setExternalMessages = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"text":"hi"}\n\ndata: [DONE]\n\n'));
          controller.close();
        },
      }),
    });

    const { useChat } = await import("@/hooks/use-chat");
    const { result } = renderHook(() =>
      useChat("scout", undefined, undefined, externalMessages, setExternalMessages),
    );

    await act(async () => {
      await result.current.sendMessage("test");
    });

    // Should call the external setter, not internal state
    expect(setExternalMessages).toHaveBeenCalled();
  });

  it("uses internal state when no external state provided", async () => {
    const { useChat } = await import("@/hooks/use-chat");
    const { result } = renderHook(() => useChat("scout"));

    expect(result.current.messages).toEqual([]);
  });
});
