import { describe, it, expect } from "vitest";
import { DEMO_SCRIPTS, type DemoEntry } from "@/lib/demo-scripts";

describe("DEMO_SCRIPTS", () => {
  it("writer script has 5 entries", () => {
    expect(DEMO_SCRIPTS.writer).toHaveLength(5);
  });

  it("writer entries 1-4 are message strings", () => {
    for (let i = 0; i < 4; i++) {
      expect(typeof DEMO_SCRIPTS.writer[i]).toBe("string");
    }
  });

  it("writer entry 5 is a switch-to-preview command", () => {
    const last = DEMO_SCRIPTS.writer[4] as Exclude<DemoEntry, string>;
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
