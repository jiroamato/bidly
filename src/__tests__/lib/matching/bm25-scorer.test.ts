import { describe, it, expect } from "vitest";
import { BM25Scorer, normalize, tokenize } from "@/lib/matching/bm25-scorer";

describe("normalize", () => {
  it("lowercases and trims", () => {
    expect(normalize("  Cloud Migration  ")).toBe("cloud migration");
  });

  it("strips punctuation", () => {
    expect(normalize("IT-consulting, Inc.")).toBe("itconsulting inc");
  });

  it("handles empty string", () => {
    expect(normalize("")).toBe("");
  });
});

describe("tokenize", () => {
  it("splits text into lowercase words", () => {
    expect(tokenize("Cloud Migration Services")).toEqual([
      "cloud",
      "migration",
      "services",
    ]);
  });

  it("removes stop words", () => {
    const tokens = tokenize("the software and support for our clients");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("and");
    expect(tokens).not.toContain("for");
    expect(tokens).not.toContain("our");
    expect(tokens).toContain("software");
    expect(tokens).toContain("support");
    expect(tokens).toContain("clients");
  });

  it("strips punctuation before tokenizing", () => {
    expect(tokenize("IT-consulting, Inc.")).toEqual(["itconsulting", "inc"]);
  });

  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("BM25Scorer", () => {
  const documents = [
    "Cybersecurity assessment for cloud infrastructure and IT security",
    "Office furniture supply and delivery services",
    "Software maintenance and technical support services",
    "Construction of highway bridge in northern Ontario",
    "IT consulting and cloud migration project management",
  ];

  it("scores a relevant query higher than irrelevant documents", () => {
    const scorer = new BM25Scorer(documents);
    const scores = scorer.score(["cybersecurity", "IT", "security", "cloud"]);

    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[0]).toBeGreaterThan(scores[3]);
  });

  it("returns 0 for documents with no matching terms", () => {
    const scorer = new BM25Scorer(documents);
    const scores = scorer.score(["plumbing", "electrical", "hvac"]);

    for (const score of scores) {
      expect(score).toBe(0);
    }
  });

  it("normalizes scores to 0-100 range", () => {
    const scorer = new BM25Scorer(documents);
    const normalized = scorer.scoreNormalized(["cybersecurity", "IT", "cloud"]);

    const max = Math.max(...normalized);
    expect(max).toBe(100);

    for (const score of normalized) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("handles single document corpus", () => {
    const scorer = new BM25Scorer(["cybersecurity audit services"]);
    const normalized = scorer.scoreNormalized(["cybersecurity"]);
    expect(normalized[0]).toBe(100);
  });

  it("handles empty query", () => {
    const scorer = new BM25Scorer(documents);
    const normalized = scorer.scoreNormalized([]);
    for (const score of normalized) {
      expect(score).toBe(0);
    }
  });

  it("handles empty corpus", () => {
    const scorer = new BM25Scorer([]);
    const normalized = scorer.scoreNormalized(["cybersecurity"]);
    expect(normalized).toEqual([]);
  });

  it("returns matched terms for a document", () => {
    const scorer = new BM25Scorer(documents);
    const matched = scorer.getMatchedTerms(0, ["cybersecurity", "cloud", "python"]);
    expect(matched).toContain("cybersecurity");
    expect(matched).toContain("cloud");
    expect(matched).not.toContain("python");
  });
});
