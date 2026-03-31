import { describe, it, expect } from "vitest";
import {
  naicsToCategories,
  scoreCategory,
} from "@/lib/matching/category-matcher";

describe("naicsToCategories", () => {
  it("maps IT NAICS codes to service categories", () => {
    const cats = naicsToCategories(["541510", "541511"]);
    expect(cats).toContain("Services");
    expect(cats).toContain("Professional Services");
  });

  it("maps construction NAICS codes", () => {
    const cats = naicsToCategories(["236220"]);
    expect(cats).toContain("Construction");
  });

  it("maps manufacturing NAICS codes", () => {
    const cats = naicsToCategories(["334110"]);
    expect(cats).toContain("Goods");
  });

  it("returns empty array for unknown codes", () => {
    const cats = naicsToCategories(["999999"]);
    expect(cats).toEqual([]);
  });

  it("deduplicates categories from multiple codes", () => {
    const cats = naicsToCategories(["541510", "541611"]);
    const serviceCount = cats.filter((c) => c === "Services").length;
    expect(serviceCount).toBe(1);
  });

  it("handles empty array", () => {
    expect(naicsToCategories([])).toEqual([]);
  });
});

describe("scoreCategory", () => {
  it("returns 100 for exact category match", () => {
    const result = scoreCategory(["541510"], "Services");
    expect(result.score).toBe(100);
  });

  it("returns 50 for partial match (substring)", () => {
    const result = scoreCategory(["541510"], "Professional");
    expect(result.score).toBe(50);
  });

  it("returns 0 for no match", () => {
    const result = scoreCategory(["541510"], "Construction");
    expect(result.score).toBe(0);
  });

  it("returns 0 when profile has no NAICS codes", () => {
    const result = scoreCategory([], "Services");
    expect(result.score).toBe(0);
  });

  it("returns 0 when tender has empty category", () => {
    const result = scoreCategory(["541510"], "");
    expect(result.score).toBe(0);
  });

  it("matches case-insensitively", () => {
    const result = scoreCategory(["541510"], "services");
    expect(result.score).toBe(100);
  });

  it("matches SRV procurement code to Services", () => {
    const result = scoreCategory(["541510"], "SRV");
    expect(result.score).toBe(100);
  });

  it("strips leading * from procurement codes (*SRV, *GD, *CNST)", () => {
    expect(scoreCategory(["541510"], "*SRV").score).toBe(100);
    expect(scoreCategory(["236220"], "*CNST").score).toBe(100);
    expect(scoreCategory(["334110"], "*GD").score).toBe(100);
  });

  it("handles combined code *SRVTGD", () => {
    const result = scoreCategory(["541510"], "*SRVTGD");
    expect(result.score).toBe(100);
  });
});
