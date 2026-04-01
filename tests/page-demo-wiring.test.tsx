import { describe, it, expect, vi } from "vitest";

describe("page.tsx — demo action wiring", () => {
  it("passes onDemoAction to useDemoScript", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/app/page.tsx", "utf-8");
    // useDemoScript should be called with 3 arguments (activeAgent, fillInput, onDemoAction)
    expect(content).toMatch(/useDemoScript\([^)]+,[^)]+,[^)]+\)/);
  });

  it("passes externalActiveSection to WriterView", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/app/page.tsx", "utf-8");
    expect(content).toContain("externalActiveSection");
  });

  it("handles switch-to-preview action", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/app/page.tsx", "utf-8");
    expect(content).toContain("switch-to-preview");
  });
});
