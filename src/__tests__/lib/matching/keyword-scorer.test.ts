import { describe, it, expect } from "vitest";
import { scoreByKeywords, normalize, computeIdf } from "@/lib/matching/keyword-scorer";

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

describe("computeIdf", () => {
  it("returns higher weight for rare keywords", () => {
    const tenderTexts = [
      "cloud migration and infrastructure",
      "cloud migration project for government",
      "cybersecurity assessment and auditing",
    ];
    const keywords = ["cloud migration", "cybersecurity"];
    const idf = computeIdf(keywords, {}, tenderTexts);
    expect(idf.get("cybersecurity")!).toBeGreaterThan(idf.get("cloud migration")!);
  });

  it("includes synonyms in document frequency count", () => {
    const tenderTexts = [
      "information technology advisory services",
      "IT consulting for modernization",
    ];
    const keywords = ["IT consulting"];
    const synonyms = { "IT consulting": ["information technology advisory"] };
    const idf = computeIdf(keywords, synonyms, tenderTexts);
    expect(idf.get("IT consulting")!).toBeLessThan(1.0);
  });

  it("returns 1.0 for keywords appearing in zero tenders", () => {
    const tenderTexts = ["something unrelated"];
    const keywords = ["cybersecurity"];
    const idf = computeIdf(keywords, {}, tenderTexts);
    expect(idf.get("cybersecurity")).toBe(1.0);
  });
});

describe("scoreByKeywords", () => {
  it("returns 0 for no keyword matches", () => {
    const result = scoreByKeywords(
      ["cybersecurity", "cloud migration"],
      {},
      "furniture supply and delivery",
      new Map([["cybersecurity", 1.0], ["cloud migration", 1.0]])
    );
    expect(result.score).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("scores based on IDF-weighted match ratio", () => {
    const idf = new Map([
      ["cybersecurity", 0.8],
      ["cloud migration", 0.3],
      ["python", 0.2],
    ]);
    const result = scoreByKeywords(
      ["cybersecurity", "cloud migration", "python"],
      {},
      "cybersecurity assessment for cloud migration",
      idf
    );
    expect(result.score).toBe(85);
    expect(result.matchedKeywords).toContain("cybersecurity");
    expect(result.matchedKeywords).toContain("cloud migration");
    expect(result.matchedKeywords).not.toContain("python");
  });

  it("matches via synonyms", () => {
    const synonyms = {
      "cybersecurity": ["cyber security", "IT security", "infosec"],
    };
    const idf = new Map([["cybersecurity", 1.0]]);
    const result = scoreByKeywords(
      ["cybersecurity"],
      synonyms,
      "IT security assessment and audit",
      idf
    );
    expect(result.score).toBe(100);
    expect(result.matchedKeywords).toContain("cybersecurity");
    expect(result.details[0].matchedVia).toBe("it security");
  });

  it("returns 0 for empty keywords array", () => {
    const result = scoreByKeywords([], {}, "some tender text", new Map());
    expect(result.score).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("handles case-insensitive matching", () => {
    const idf = new Map([["python", 1.0]]);
    const result = scoreByKeywords(
      ["Python"],
      {},
      "PYTHON development services",
      idf
    );
    expect(result.score).toBe(100);
    expect(result.matchedKeywords).toContain("Python");
  });
});
