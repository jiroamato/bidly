import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgent } from "@/hooks/use-agent";

describe("useAgent hook", () => {
  it("initializes with profile active, all others locked", () => {
    const { result } = renderHook(() => useAgent());
    expect(result.current.activeAgent).toBe("profile");
    expect(result.current.statuses.profile).toBe("active");
    expect(result.current.statuses.scout).toBe("locked");
    expect(result.current.statuses.analyst).toBe("locked");
    expect(result.current.statuses.compliance).toBe("locked");
    expect(result.current.statuses.writer).toBe("locked");
  });

  it("initializes with null profile and selectedTender", () => {
    const { result } = renderHook(() => useAgent());
    expect(result.current.profile).toBeNull();
    expect(result.current.selectedTender).toBeNull();
  });

  describe("setActiveAgent", () => {
    it("does NOT switch to a locked agent", () => {
      const { result } = renderHook(() => useAgent());
      act(() => result.current.setActiveAgent("scout"));
      expect(result.current.activeAgent).toBe("profile"); // unchanged
    });

    it("switches to an unlocked agent", () => {
      const { result } = renderHook(() => useAgent());
      // Complete profile to unlock scout
      act(() => result.current.completeAgent("profile"));
      act(() => result.current.setActiveAgent("scout"));
      expect(result.current.activeAgent).toBe("scout");
    });

    it("allows revisiting a completed agent without changing its status", () => {
      const { result } = renderHook(() => useAgent());
      act(() => result.current.completeAgent("profile"));
      act(() => result.current.setActiveAgent("scout"));
      // Go back to profile
      act(() => result.current.setActiveAgent("profile"));
      expect(result.current.activeAgent).toBe("profile");
      expect(result.current.statuses.profile).toBe("completed"); // stays completed
    });
  });

  describe("completeAgent", () => {
    it("marks agent as completed", () => {
      const { result } = renderHook(() => useAgent());
      act(() => result.current.completeAgent("profile"));
      expect(result.current.statuses.profile).toBe("completed");
    });

    it("unlocks the next agent in sequence", () => {
      const { result } = renderHook(() => useAgent());
      act(() => result.current.completeAgent("profile"));
      expect(result.current.statuses.scout).toBe("active");
      // analyst should still be locked
      expect(result.current.statuses.analyst).toBe("locked");
    });

    it("completing the last agent does not crash (edge case: no next agent)", () => {
      const { result } = renderHook(() => useAgent());
      // Unlock all agents sequentially
      act(() => result.current.completeAgent("profile"));
      act(() => result.current.completeAgent("scout"));
      act(() => result.current.completeAgent("analyst"));
      act(() => result.current.completeAgent("compliance"));
      // This should not throw
      act(() => result.current.completeAgent("writer"));
      expect(result.current.statuses.writer).toBe("completed");
    });

    it("does not re-lock an already active agent when completing a previous one", () => {
      const { result } = renderHook(() => useAgent());
      act(() => result.current.completeAgent("profile"));
      // Scout is now active. Switch to it.
      act(() => result.current.setActiveAgent("scout"));
      expect(result.current.statuses.scout).toBe("active");
      // Complete profile again (edge case: double complete)
      act(() => result.current.completeAgent("profile"));
      // Scout should still be active, not overwritten
      expect(result.current.statuses.scout).toBe("active");
    });

    it("skipping an agent — completing out of order (edge case)", () => {
      const { result } = renderHook(() => useAgent());
      // Try completing scout directly (still locked)
      act(() => result.current.completeAgent("scout"));
      // Scout becomes completed even though it was locked (no guard in completeAgent)
      expect(result.current.statuses.scout).toBe("completed");
      // This unlocks analyst
      expect(result.current.statuses.analyst).toBe("active");
    });
  });

  describe("setProfile", () => {
    it("stores the business profile", () => {
      const { result } = renderHook(() => useAgent());
      const mockProfile = {
        id: 1,
        company_name: "Test Corp",
        naics_codes: ["238220"],
        location: "Toronto",
        province: "Ontario",
        capabilities: "Plumbing",
        keywords: ["plumbing"],
        created_at: "2026-03-22T00:00:00Z",
      };
      act(() => result.current.setProfile(mockProfile));
      expect(result.current.profile).toEqual(mockProfile);
    });

    it("overwrites previous profile", () => {
      const { result } = renderHook(() => useAgent());
      const profile1 = {
        id: 1, company_name: "A", naics_codes: [], location: "", province: "",
        capabilities: "", keywords: [], created_at: "",
      };
      const profile2 = {
        id: 2, company_name: "B", naics_codes: [], location: "", province: "",
        capabilities: "", keywords: [], created_at: "",
      };
      act(() => result.current.setProfile(profile1));
      act(() => result.current.setProfile(profile2));
      expect(result.current.profile?.company_name).toBe("B");
    });
  });

  describe("setSelectedTender", () => {
    it("stores the selected tender", () => {
      const { result } = renderHook(() => useAgent());
      const mockTender = {
        id: 1, reference_number: "PW-2026-0847", solicitation_number: "",
        title: "Water Main", description: "", publication_date: "",
        closing_date: "2026-04-15", status: "Open", procurement_category: "CNST",
        notice_type: "", procurement_method: "", selection_criteria: "",
        gsin_codes: [], unspsc_codes: [], regions_of_opportunity: [],
        regions_of_delivery: [], trade_agreements: [], contracting_entity: "",
        notice_url: "", attachment_urls: [],
      };
      act(() => result.current.setSelectedTender(mockTender));
      expect(result.current.selectedTender).toEqual(mockTender);
    });
  });
});
