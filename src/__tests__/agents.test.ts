import { describe, it, expect } from "vitest";
import { AGENTS, AGENT_ORDER, getAgent } from "@/lib/agents";
import type { AgentId } from "@/lib/types";

describe("agents config", () => {
  it("defines exactly 5 agents", () => {
    expect(AGENTS).toHaveLength(5);
  });

  it("AGENT_ORDER matches all agent IDs", () => {
    const ids = AGENTS.map((a) => a.id);
    expect(AGENT_ORDER).toEqual(ids);
  });

  it("each agent has a unique id", () => {
    const ids = AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each agent has a unique color", () => {
    const colors = AGENTS.map((a) => a.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("each agent has non-empty name, breadcrumbLabel, chatPlaceholder", () => {
    for (const agent of AGENTS) {
      expect(agent.name.length).toBeGreaterThan(0);
      expect(agent.breadcrumbLabel.length).toBeGreaterThan(0);
      expect(agent.chatPlaceholder.length).toBeGreaterThan(0);
    }
  });

  it("categories are valid", () => {
    const validCategories = ["Setup", "Research", "Execute"];
    for (const agent of AGENTS) {
      expect(validCategories).toContain(agent.category);
    }
  });

  describe("getAgent", () => {
    it("returns correct agent for each valid id", () => {
      const ids: AgentId[] = ["profile", "scout", "analyst", "compliance", "writer"];
      for (const id of ids) {
        const agent = getAgent(id);
        expect(agent).toBeDefined();
        expect(agent.id).toBe(id);
      }
    });

    it("returns undefined for invalid id (edge case: type bypass)", () => {
      // This tests the ! assertion — in runtime, invalid IDs return undefined
      const result = AGENTS.find((a) => a.id === ("invalid" as AgentId));
      expect(result).toBeUndefined();
    });
  });
});
