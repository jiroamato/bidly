import { describe, it, expect } from "vitest";
import fs from "fs";

describe("ScoutView", () => {
  it("does not contain BOOST_KEYWORDS constant", async () => {
    const source = await import("@/components/views/scout-view");
    expect((source as any).BOOST_KEYWORDS).toBeUndefined();
  });

  it("does not contain hardcoded limit=50", () => {
    const content = fs.readFileSync("src/components/views/scout-view.tsx", "utf-8");
    expect(content).not.toContain("limit=50");
    expect(content).not.toContain("limit: 50");
  });

  it("does not contain hardcoded percentage scores", () => {
    const content = fs.readFileSync("src/components/views/scout-view.tsx", "utf-8");
    // No hardcoded 99%, 97%, 88% scoring
    expect(content).not.toMatch(/Math\.random\(\)\s*\*\s*30/);
  });
});
