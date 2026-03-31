import { describe, it, expect } from "vitest";
import { extractKeywordsFromCapabilities } from "@/app/api/profile/extract-keywords";

describe("extractKeywordsFromCapabilities", () => {
  it("splits long phrases into atomic terms", () => {
    const result = extractKeywordsFromCapabilities(
      "software maintenance and support, IT systems management"
    );
    expect(result).toContain("software");
    expect(result).toContain("maintenance");
    expect(result).toContain("support");
    expect(result).toContain("systems");
    expect(result).toContain("management");
    expect(result).not.toContain("and");
    expect(result).not.toContain("the");
  });

  it("preserves IT as a keyword", () => {
    const result = extractKeywordsFromCapabilities("IT consulting services");
    expect(result).toContain("consulting");
    expect(result).toContain("services");
  });

  it("deduplicates terms", () => {
    const result = extractKeywordsFromCapabilities(
      "software support, software maintenance, software development"
    );
    const softwareCount = result.filter((k) => k === "software").length;
    expect(softwareCount).toBe(1);
  });

  it("returns empty array for empty input", () => {
    expect(extractKeywordsFromCapabilities("")).toEqual([]);
  });

  it("limits to 50 terms", () => {
    const longCapabilities = Array.from(
      { length: 100 },
      (_, i) => `keyword${i}`
    ).join(", ");
    const result = extractKeywordsFromCapabilities(longCapabilities);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("filters out very short words (1-2 chars) except known acronyms", () => {
    const result = extractKeywordsFromCapabilities("IT is a top service");
    expect(result).not.toContain("is");
    expect(result).not.toContain("a");
  });
});
