import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgent } from "@/hooks/use-agent";

describe("useAgent cache fields", () => {
  it("initializes matchedTenders as empty array", () => {
    const { result } = renderHook(() => useAgent());
    expect(result.current.matchedTenders).toEqual([]);
  });

  it("initializes tenderAnalysis as null", () => {
    const { result } = renderHook(() => useAgent());
    expect(result.current.tenderAnalysis).toBeNull();
  });

  it("setMatchedTenders stores tenders", () => {
    const { result } = renderHook(() => useAgent());
    const fakeTenders = [{ id: 1, match_score: 90 }] as any;

    act(() => {
      result.current.setMatchedTenders(fakeTenders);
    });

    expect(result.current.matchedTenders).toBe(fakeTenders);
  });

  it("setTenderAnalysis stores analysis", () => {
    const { result } = renderHook(() => useAgent());
    const fakeAnalysis = { whatTheyWant: ["test"] } as any;

    act(() => {
      result.current.setTenderAnalysis(fakeAnalysis);
    });

    expect(result.current.tenderAnalysis).toBe(fakeAnalysis);
  });

  it("setProfile clears matchedTenders", () => {
    const { result } = renderHook(() => useAgent());

    act(() => {
      result.current.setMatchedTenders([{ id: 1, match_score: 90 }] as any);
    });
    expect(result.current.matchedTenders).toHaveLength(1);

    act(() => {
      result.current.setProfile({ id: 2, company_name: "New" } as any);
    });
    expect(result.current.matchedTenders).toEqual([]);
  });

  it("setSelectedTender clears tenderAnalysis", () => {
    const { result } = renderHook(() => useAgent());

    act(() => {
      result.current.setTenderAnalysis({ whatTheyWant: ["test"] } as any);
    });
    expect(result.current.tenderAnalysis).not.toBeNull();

    act(() => {
      result.current.setSelectedTender({ id: 99, title: "New" } as any);
    });
    expect(result.current.tenderAnalysis).toBeNull();
  });

  it("resetDemo clears both caches", () => {
    const { result } = renderHook(() => useAgent());

    act(() => {
      result.current.setMatchedTenders([{ id: 1, match_score: 90 }] as any);
      result.current.setTenderAnalysis({ whatTheyWant: ["test"] } as any);
    });

    act(() => {
      result.current.resetDemo();
    });

    expect(result.current.matchedTenders).toEqual([]);
    expect(result.current.tenderAnalysis).toBeNull();
  });
});
