import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ChatHistoryProvider, useChatHistory, useChatHistoryActions } from "@/contexts/chat-history-context";
import { type ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ChatHistoryProvider>{children}</ChatHistoryProvider>
);

describe("ChatHistoryContext", () => {
  it("returns empty array for each agent initially", () => {
    const { result } = renderHook(() => useChatHistory("profile"), { wrapper });
    const [messages] = result.current;
    expect(messages).toEqual([]);
  });

  it("setMessages updates the correct agent slot", () => {
    const { result } = renderHook(() => useChatHistory("scout"), { wrapper });

    act(() => {
      const [, setMessages] = result.current;
      setMessages([{ role: "user", content: "hello", timestamp: 1 }]);
    });

    const [messages] = result.current;
    expect(messages).toEqual([{ role: "user", content: "hello", timestamp: 1 }]);
  });

  it("does not affect other agent slots when one is updated", () => {
    const { result } = renderHook(
      () => ({
        scout: useChatHistory("scout"),
        profile: useChatHistory("profile"),
      }),
      { wrapper },
    );

    act(() => {
      const [, setScout] = result.current.scout;
      setScout([{ role: "user", content: "scout msg", timestamp: 1 }]);
    });

    const [profileMessages] = result.current.profile;
    expect(profileMessages).toEqual([]);
  });

  it("supports functional updater for setMessages", () => {
    const { result } = renderHook(() => useChatHistory("writer"), { wrapper });

    act(() => {
      const [, setMessages] = result.current;
      setMessages([{ role: "user", content: "first", timestamp: 1 }]);
    });

    act(() => {
      const [, setMessages] = result.current;
      setMessages((prev) => [...prev, { role: "assistant", content: "second", timestamp: 2 }]);
    });

    const [messages] = result.current;
    expect(messages).toHaveLength(2);
    expect(messages[1].content).toBe("second");
  });

  it("clearAllMessages resets all agent slots to empty", () => {
    const { result } = renderHook(
      () => ({
        profile: useChatHistory("profile"),
        scout: useChatHistory("scout"),
        actions: useChatHistoryActions(),
      }),
      { wrapper },
    );

    act(() => {
      const [, setProfile] = result.current.profile;
      const [, setScout] = result.current.scout;
      setProfile([{ role: "user", content: "p", timestamp: 1 }]);
      setScout([{ role: "user", content: "s", timestamp: 2 }]);
    });

    act(() => {
      result.current.actions.clearAllMessages();
    });

    const [profileMsgs] = result.current.profile;
    const [scoutMsgs] = result.current.scout;
    expect(profileMsgs).toEqual([]);
    expect(scoutMsgs).toEqual([]);
  });

  it("throws when useChatHistory is used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useChatHistory("profile"))).toThrow();
    spy.mockRestore();
  });
});
