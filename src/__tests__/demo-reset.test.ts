import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgent } from "@/hooks/use-agent";

// Suppress the hydration fetch so it doesn't interfere with tests
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ error: "not found" }), { status: 404 })
  );
});

describe("resetDemo", () => {
  it("clears profile back to null", () => {
    const { result } = renderHook(() => useAgent());
    act(() =>
      result.current.setProfile({
        id: 1, company_name: "Test", naics_codes: [], location: "", province: "",
        capabilities: "", keywords: [], keyword_synonyms: {}, embedding: null,
        insurance_amount: "", bonding_limit: null, certifications: [],
        years_in_business: null, past_gov_experience: "", pbn: "",
        is_canadian: null, security_clearance: "", project_size_min: null,
        project_size_max: null, created_at: "",
      })
    );
    expect(result.current.profile).not.toBeNull();

    act(() => result.current.resetDemo());
    expect(result.current.profile).toBeNull();
  });

  it("clears selectedTender back to null", () => {
    const { result } = renderHook(() => useAgent());
    act(() => result.current.setSelectedTender({ id: 99 } as any));
    expect(result.current.selectedTender).not.toBeNull();

    act(() => result.current.resetDemo());
    expect(result.current.selectedTender).toBeNull();
  });

  it("resets all agent statuses to initial state", () => {
    const { result } = renderHook(() => useAgent());
    act(() => result.current.completeAgent("profile"));
    act(() => result.current.completeAgent("scout"));
    expect(result.current.statuses.profile).toBe("completed");
    expect(result.current.statuses.scout).toBe("completed");

    act(() => result.current.resetDemo());
    expect(result.current.statuses.profile).toBe("active");
    expect(result.current.statuses.scout).toBe("locked");
    expect(result.current.statuses.analyst).toBe("locked");
    expect(result.current.statuses.compliance).toBe("locked");
    expect(result.current.statuses.writer).toBe("locked");
  });

  it("resets activeAgent to profile", () => {
    const { result } = renderHook(() => useAgent());
    act(() => result.current.completeAgent("profile"));
    act(() => result.current.setActiveAgent("scout"));
    expect(result.current.activeAgent).toBe("scout");

    act(() => result.current.resetDemo());
    expect(result.current.activeAgent).toBe("profile");
  });
});
