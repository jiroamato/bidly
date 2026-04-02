import { describe, it, expect } from "vitest";
import { DEMO_SCRIPTS, type DemoEntry } from "@/lib/demo-scripts";

describe("DEMO_SCRIPTS", () => {
  it("writer script has 6 entries", () => {
    expect(DEMO_SCRIPTS.writer).toHaveLength(6);
  });

  it("writer entries 1-5 are message strings", () => {
    for (let i = 0; i < 5; i++) {
      expect(typeof DEMO_SCRIPTS.writer[i]).toBe("string");
    }
  });

  it("writer last entry is a switch-to-preview command", () => {
    const last = DEMO_SCRIPTS.writer[5] as Exclude<DemoEntry, string>;
    expect(typeof last).toBe("object");
    expect(last.action).toBe("switch-to-preview");
  });

  it("other agent scripts are unchanged string arrays", () => {
    for (const agentId of ["profile", "scout", "analyst", "compliance"] as const) {
      for (const entry of DEMO_SCRIPTS[agentId]) {
        expect(typeof entry).toBe("string");
      }
    }
  });
});
