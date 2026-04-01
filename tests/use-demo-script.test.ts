import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDemoScript } from "@/hooks/use-demo-script";

describe("useDemoScript", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls fillInput for string entries", () => {
    const fillInput = vi.fn();
    const onDemoAction = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("profile", fillInput, onDemoAction)
    );

    act(() => {
      result.current.advanceScript();
    });

    // fillInput should be called (typewriter starts)
    expect(fillInput).toHaveBeenCalled();
    // onDemoAction should NOT be called for string entries
    expect(onDemoAction).not.toHaveBeenCalled();
  });

  it("calls onDemoAction for command entries instead of fillInput", () => {
    const fillInput = vi.fn();
    const onDemoAction = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("writer", fillInput, onDemoAction)
    );

    // Advance through all 4 string entries
    for (let i = 0; i < 4; i++) {
      act(() => {
        result.current.advanceScript();
      });
      // Let typewriter finish
      act(() => {
        vi.advanceTimersByTime(10000);
      });
    }

    // Clear mocks before the command entry
    fillInput.mockClear();
    onDemoAction.mockClear();

    // 5th entry is the command
    act(() => {
      result.current.advanceScript();
    });

    expect(onDemoAction).toHaveBeenCalledWith({ action: "switch-to-preview" });
    expect(fillInput).not.toHaveBeenCalled();
  });

  it("hasMoreScripts returns false after all entries consumed", () => {
    const fillInput = vi.fn();
    const onDemoAction = vi.fn();
    const { result } = renderHook(() =>
      useDemoScript("writer", fillInput, onDemoAction)
    );

    // Advance through all 5
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.advanceScript();
      });
      act(() => {
        vi.advanceTimersByTime(10000);
      });
    }

    expect(result.current.hasMoreScripts).toBe(false);
  });
});
