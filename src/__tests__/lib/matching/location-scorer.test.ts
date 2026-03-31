import { describe, it, expect } from "vitest";
import { scoreLocation } from "@/lib/matching/location-scorer";

describe("scoreLocation", () => {
  it("returns 100 when tender delivers to profile province", () => {
    const result = scoreLocation("Ontario", [
      "Ontario (except NCR)",
      "Quebec",
    ]);
    expect(result.score).toBe(100);
  });

  it("returns 100 for national scope (Canada)", () => {
    const result = scoreLocation("Ontario", ["Canada"]);
    expect(result.score).toBe(100);
  });

  it("returns 0 when province does not match", () => {
    const result = scoreLocation("Ontario", ["Alberta", "British Columbia"]);
    expect(result.score).toBe(0);
  });

  it("is case-insensitive", () => {
    const result = scoreLocation("ontario", ["ONTARIO"]);
    expect(result.score).toBe(100);
  });

  it("returns 0 for empty regions array", () => {
    const result = scoreLocation("Ontario", []);
    expect(result.score).toBe(0);
  });

  it("returns 0 for empty province", () => {
    const result = scoreLocation("", ["Ontario"]);
    expect(result.score).toBe(0);
  });

  it("matches substring (e.g., 'Ontario' in 'Ontario (except NCR)')", () => {
    const result = scoreLocation("Ontario", ["Ontario (except NCR)"]);
    expect(result.score).toBe(100);
  });
});
