import { describe, it, expect } from "vitest";

describe("WriterView", () => {
  it("does not contain MOCK_CONTENT constant", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    expect(content).not.toContain("MOCK_CONTENT");
  });

  it("does not contain PDF_PRICING constant", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    expect(content).not.toContain("PDF_PRICING");
    expect(content).not.toContain("PDF_MONTHLY_TOTAL");
    expect(content).not.toContain("PDF_ANNUAL_TOTAL");
    expect(content).not.toContain("PDF_GST");
    expect(content).not.toContain("PDF_GRAND_TOTAL");
  });

  it("does not contain hardcoded section statuses", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/writer-view.tsx", "utf-8");
    // Should not have hardcoded "done" or "draft" in SECTIONS array
    expect(content).not.toMatch(/status:\s*["']done["']/);
    expect(content).not.toMatch(/status:\s*["']draft["']/);
  });
});
