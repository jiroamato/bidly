import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDemoScript } from "@/hooks/use-demo-script";
import { DEMO_SCRIPTS } from "@/lib/demo-scripts";

describe("useDemoScript", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("advanceScript calls fillInput with characters from the first message", () => {
    const fillInput = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("profile", fillInput)
    );

    act(() => result.current.advanceScript());

    const firstMsg = DEMO_SCRIPTS.profile[0];
    act(() => vi.advanceTimersByTime(firstMsg.length * 25 + 100));

    const lastCall = fillInput.mock.calls[fillInput.mock.calls.length - 1][0];
    expect(lastCall).toBe(firstMsg);
  });

  it("second advanceScript call uses the second message", () => {
    const fillInput = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("profile", fillInput)
    );

    act(() => result.current.advanceScript());
    const firstMsg = DEMO_SCRIPTS.profile[0];
    act(() => vi.advanceTimersByTime(firstMsg.length * 25 + 100));

    fillInput.mockClear();

    act(() => result.current.advanceScript());
    const secondMsg = DEMO_SCRIPTS.profile[1];
    act(() => vi.advanceTimersByTime(secondMsg.length * 25 + 100));

    const lastCall = fillInput.mock.calls[fillInput.mock.calls.length - 1][0];
    expect(lastCall).toBe(secondMsg);
  });

  it("no-ops when script is exhausted", () => {
    const fillInput = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("analyst", fillInput)
    );

    act(() => result.current.advanceScript());
    const msg = DEMO_SCRIPTS.analyst[0];
    act(() => vi.advanceTimersByTime(msg.length * 25 + 100));

    fillInput.mockClear();

    act(() => result.current.advanceScript());
    act(() => vi.advanceTimersByTime(1000));
    expect(fillInput).not.toHaveBeenCalled();
  });

  it("hasMoreScripts is true when messages remain", () => {
    const fillInput = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("profile", fillInput)
    );

    expect(result.current.hasMoreScripts).toBe(true);
  });

  it("hasMoreScripts is false when exhausted", () => {
    const fillInput = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("analyst", fillInput)
    );

    act(() => result.current.advanceScript());
    const msg = DEMO_SCRIPTS.analyst[0];
    act(() => vi.advanceTimersByTime(msg.length * 25 + 100));

    expect(result.current.hasMoreScripts).toBe(false);
  });

  it("resetScripts resets index so first message plays again", () => {
    const fillInput = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("profile", fillInput)
    );

    act(() => result.current.advanceScript());
    const firstMsg = DEMO_SCRIPTS.profile[0];
    act(() => vi.advanceTimersByTime(firstMsg.length * 25 + 100));

    fillInput.mockClear();

    act(() => result.current.resetScripts());
    act(() => result.current.advanceScript());
    act(() => vi.advanceTimersByTime(firstMsg.length * 25 + 100));

    const lastCall = fillInput.mock.calls[fillInput.mock.calls.length - 1][0];
    expect(lastCall).toBe(firstMsg);
  });

  it("tracks indices independently per agent when activeAgent changes", () => {
    const fillInput = vi.fn();
    const { result, rerender } = renderHook(
      ({ agent }) => useDemoScript(agent, fillInput),
      { initialProps: { agent: "profile" as const } }
    );

    act(() => result.current.advanceScript());
    act(() => vi.advanceTimersByTime(DEMO_SCRIPTS.profile[0].length * 25 + 100));

    fillInput.mockClear();

    rerender({ agent: "scout" as const });

    act(() => result.current.advanceScript());
    act(() => vi.advanceTimersByTime(DEMO_SCRIPTS.scout[0].length * 25 + 100));

    const lastCall = fillInput.mock.calls[fillInput.mock.calls.length - 1][0];
    expect(lastCall).toBe(DEMO_SCRIPTS.scout[0]);
  });

  it("cancels in-progress typewriter when advanceScript is called again", () => {
    const fillInput = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("profile", fillInput)
    );

    act(() => result.current.advanceScript());
    act(() => vi.advanceTimersByTime(50));

    fillInput.mockClear();

    act(() => result.current.advanceScript());
    const secondMsg = DEMO_SCRIPTS.profile[1];
    act(() => vi.advanceTimersByTime(secondMsg.length * 25 + 100));

    const lastCall = fillInput.mock.calls[fillInput.mock.calls.length - 1][0];
    expect(lastCall).toBe(secondMsg);
  });
});
