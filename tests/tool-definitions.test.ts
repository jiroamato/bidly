import { describe, it, expect } from "vitest";
import { TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { AGENT_TOOLS } from "@/lib/ai/prompts";

describe("TOOL_DEFINITIONS", () => {
  const toolNames = TOOL_DEFINITIONS.map((t) => t.name);

  it("includes all new tools", () => {
    const expectedTools = [
      "searchTenders",
      "getTenderDetails",
      "getCompanyProfile",
      "calculatePricing",
      "saveProgress",
      "summarizeTender",
      "getFormChecklist",
      "explainForm",
      "matchTendersToProfile",
      "filterTenders",
      "checkBuyCanadian",
      "runComplianceAssessment",
      "saveTenderSelection",
      "saveAnalysis",
      "saveComplianceResult",
      "saveDraft",
      "updateProfile",
      "draftBidSection",
    ];

    for (const tool of expectedTools) {
      expect(toolNames).toContain(tool);
    }
  });

  it("does not include removed tools", () => {
    expect(toolNames).not.toContain("checkEligibility");
  });

  it("matchTendersToProfile requires profile_id", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "matchTendersToProfile");
    expect(tool?.input_schema.required).toContain("profile_id");
  });

  it("checkBuyCanadian requires is_canadian", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "checkBuyCanadian");
    expect(tool?.input_schema.required).toContain("is_canadian");
  });

  it("filterTenders has optional date range params", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "filterTenders");
    expect(tool?.input_schema.properties).toHaveProperty("closing_after");
    expect(tool?.input_schema.properties).toHaveProperty("closing_before");
  });
});

describe("AGENT_TOOLS mapping", () => {
  it("profile agent has saveProgress and updateProfile", () => {
    expect(AGENT_TOOLS.profile).toContain("saveProgress");
    expect(AGENT_TOOLS.profile).toContain("updateProfile");
  });

  it("scout agent has matching and search tools", () => {
    expect(AGENT_TOOLS.scout).toContain("matchTendersToProfile");
    expect(AGENT_TOOLS.scout).toContain("searchTenders");
    expect(AGENT_TOOLS.scout).toContain("filterTenders");
    expect(AGENT_TOOLS.scout).toContain("getTenderDetails");
    expect(AGENT_TOOLS.scout).toContain("saveTenderSelection");
  });

  it("analyst has analysis tools", () => {
    expect(AGENT_TOOLS.analyst).toContain("getTenderDetails");
    expect(AGENT_TOOLS.analyst).toContain("summarizeTender");
    expect(AGENT_TOOLS.analyst).toContain("getFormChecklist");
    expect(AGENT_TOOLS.analyst).toContain("saveAnalysis");
    expect(AGENT_TOOLS.analyst).toContain("getMatchContext");
  });

  it("compliance has buy canadian hard gate", () => {
    expect(AGENT_TOOLS.compliance).toContain("checkBuyCanadian");
    expect(AGENT_TOOLS.compliance).toContain("runComplianceAssessment");
    expect(AGENT_TOOLS.compliance).toContain("saveComplianceResult");
  });

  it("writer has drafting and pricing tools", () => {
    expect(AGENT_TOOLS.writer).toContain("draftBidSection");
    expect(AGENT_TOOLS.writer).toContain("saveDraft");
    expect(AGENT_TOOLS.writer).toContain("calculatePricing");
    expect(AGENT_TOOLS.writer).toContain("explainForm");
  });

  it("updateProfile is available to all agents", () => {
    for (const agentId of ["profile", "scout", "analyst", "compliance", "writer"]) {
      expect(AGENT_TOOLS[agentId as keyof typeof AGENT_TOOLS]).toContain("updateProfile");
    }
  });

  it("every tool in AGENT_TOOLS has a matching TOOL_DEFINITION", () => {
    const definedToolNames = TOOL_DEFINITIONS.map((t) => t.name);
    for (const [agentId, tools] of Object.entries(AGENT_TOOLS)) {
      for (const tool of tools) {
        expect(definedToolNames, `Tool "${tool}" assigned to ${agentId} but not defined`).toContain(tool);
      }
    }
  });
});
