import { describe, it, expect } from "vitest";

describe("ComplianceView", () => {
  it("does not contain DEMO_PAIRS constant", async () => {
    const source = await import("@/components/views/compliance-view");
    expect((source as any).DEMO_PAIRS).toBeUndefined();
  });

  it("does not contain hardcoded demoAssessment", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/compliance-view.tsx", "utf-8");
    expect(content).not.toContain("demoAssessment");
    expect(content).not.toContain("generateAssessment");
  });

  it("does not contain setTimeout fake delay", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/components/views/compliance-view.tsx", "utf-8");
    expect(content).not.toContain("setTimeout");
  });
});
