import { describe, it, expect } from "vitest";
import { cosineSimilarity, scoreByEmbedding } from "@/lib/matching/embedding-scorer";

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it("handles real-world-like vectors", () => {
    const a = [0.1, 0.5, 0.3, 0.8];
    const b = [0.2, 0.4, 0.35, 0.75];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.95);
    expect(sim).toBeLessThanOrEqual(1.0);
  });

  it("returns 0 for zero vector", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });
});

describe("scoreByEmbedding", () => {
  it("converts similarity to 0-100 score", () => {
    const result = scoreByEmbedding([1, 0, 0], [1, 0, 0]);
    expect(result.score).toBe(100);
  });

  it("returns 0 for orthogonal vectors", () => {
    const result = scoreByEmbedding([1, 0], [0, 1]);
    expect(result.score).toBe(0);
  });

  it("clamps negative similarity to 0", () => {
    const result = scoreByEmbedding([1, 0], [-1, 0]);
    expect(result.score).toBe(0);
  });

  it("returns 0 when either embedding is null", () => {
    expect(scoreByEmbedding(null, [1, 2, 3]).score).toBe(0);
    expect(scoreByEmbedding([1, 2, 3], null).score).toBe(0);
    expect(scoreByEmbedding(null, null).score).toBe(0);
  });
});
