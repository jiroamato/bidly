import { describe, it, expect } from "vitest";
import { DEMO_SCRIPTS } from "@/lib/demo-scripts";
import { AGENT_ORDER } from "@/lib/agents";

describe("DEMO_SCRIPTS", () => {
  it("has an entry for every agent in AGENT_ORDER", () => {
    for (const agentId of AGENT_ORDER) {
      expect(DEMO_SCRIPTS).toHaveProperty(agentId);
    }
  });

  it("no agent has an empty array", () => {
    for (const agentId of AGENT_ORDER) {
      expect(DEMO_SCRIPTS[agentId].length).toBeGreaterThan(0);
    }
  });

  it("no message is empty or too short", () => {
    for (const agentId of AGENT_ORDER) {
      for (const msg of DEMO_SCRIPTS[agentId]) {
        expect(msg.trim().length).toBeGreaterThan(10);
      }
    }
  });
});
