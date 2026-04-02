import { describe, it, expect } from "vitest";
import { SCORING_WEIGHTS } from "@/lib/matching/types";

describe("SCORING_WEIGHTS", () => {
  it("has four signals that sum to 1.0", () => {
    const sum =
      SCORING_WEIGHTS.bm25 +
      SCORING_WEIGHTS.category +
      SCORING_WEIGHTS.synonym +
      SCORING_WEIGHTS.location;
    expect(sum).toBeCloseTo(1.0);
  });

  it("has correct individual weights", () => {
    expect(SCORING_WEIGHTS.bm25).toBe(0.45);
    expect(SCORING_WEIGHTS.category).toBe(0.25);
    expect(SCORING_WEIGHTS.synonym).toBe(0.15);
    expect(SCORING_WEIGHTS.location).toBe(0.15);
  });
});
