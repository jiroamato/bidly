import { createServerClient } from "@/lib/supabase";
import { AgentId } from "@/lib/types";

export interface AgentContext {
  profile?: any;
  tender?: any;
  matchContext?: any;
  analysis?: any;
  compliance?: any;
}

// What each agent needs from Supabase
const AGENT_READS: Record<AgentId, string[]> = {
  profile: [],
  scout: ["business_profiles"],
  analyst: ["business_profiles", "tenders", "tender_selections"],
  compliance: ["business_profiles", "tenders", "tender_analyses"],
  writer: ["business_profiles", "tenders", "tender_analyses", "eligibility_checks"],
};

export async function buildAgentContext(
  agentId: AgentId,
  profileId: number,
  tenderId?: number
): Promise<AgentContext> {
  const needs = AGENT_READS[agentId];
  if (needs.length === 0) return {};

  const supabase = createServerClient();
  const ctx: AgentContext = {};

  if (needs.includes("business_profiles")) {
    const { data } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", profileId)
      .single();
    ctx.profile = data || null;
  }

  if (needs.includes("tenders") && tenderId) {
    const { data } = await supabase
      .from("tenders")
      .select("*")
      .eq("id", tenderId)
      .single();
    ctx.tender = data || null;
  }

  if (needs.includes("tender_selections") && tenderId) {
    const { data } = await supabase
      .from("tender_selections")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tender_id", tenderId)
      .single();
    ctx.matchContext = data || null;
  }

  if (needs.includes("tender_analyses") && tenderId) {
    const { data } = await supabase
      .from("tender_analyses")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tender_id", tenderId)
      .single();
    ctx.analysis = data || null;
  }

  if (needs.includes("eligibility_checks") && tenderId) {
    const { data } = await supabase
      .from("eligibility_checks")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tender_id", tenderId)
      .single();
    ctx.compliance = data || null;
  }

  return ctx;
}

export function formatContextForPrompt(ctx: AgentContext): string {
  const parts: string[] = [];

  if (ctx.profile) {
    const p = ctx.profile;
    parts.push(`COMPANY PROFILE:
Company: ${p.company_name}
Province: ${p.province}
Location: ${p.location}
Services: ${p.capabilities}
Keywords: ${(p.keywords || []).join(", ")}
NAICS Codes: ${(p.naics_codes || []).join(", ")}
Years in Business: ${p.years_in_business ?? "Unknown"}
Project Size Range: ${p.project_size_min ? `$${p.project_size_min.toLocaleString()} - $${p.project_size_max?.toLocaleString()}` : "Unknown"}
Insurance: ${p.insurance_amount || "Unknown"}
Bonding Limit: ${p.bonding_limit ? `$${p.bonding_limit.toLocaleString()}` : "Unknown"}
Certifications: ${(p.certifications || []).join(", ") || "None listed"}
Security Clearance: ${p.security_clearance || "Unknown"}
Canadian Business: ${p.is_canadian === true ? "Yes" : p.is_canadian === false ? "No" : "Unknown"}
PBN: ${p.pbn || "Not provided"}
Past Government Experience: ${p.past_gov_experience || "None listed"}`);
  }

  if (ctx.tender) {
    const t = ctx.tender;
    parts.push(`SELECTED TENDER:
Title: ${t.title}
Reference: ${t.reference_number}
Entity: ${t.contracting_entity}
Closing Date: ${t.closing_date}
Category: ${t.procurement_category}
Status: ${t.status}
Regions: ${(t.regions_of_delivery || []).join(", ")}
Trade Agreements: ${(t.trade_agreements || []).join(", ")}
Description: ${t.description}`);
  }

  if (ctx.matchContext) {
    const m = ctx.matchContext;
    parts.push(`SCOUT MATCH CONTEXT:
Match Score: ${m.match_score}%
Matched Keywords: ${(m.matched_keywords || []).join(", ")}
Match Reasoning: ${m.match_reasoning}`);
  }

  if (ctx.analysis?.analysis) {
    const a = ctx.analysis.analysis;
    parts.push(`TENDER ANALYSIS:
Scope: ${(a.whatTheyWant || []).join("; ")}
Risks: ${(a.risks || []).map((r: any) => `[${r.level}] ${r.text}`).join("; ")}
Evaluation: ${(a.evaluation || []).map((e: any) => `${e.criteria}: ${e.weight}`).join(", ")}
Forms Required: ${(a.forms || []).join(", ")}`);
  }

  if (ctx.compliance) {
    const c = ctx.compliance;
    parts.push(`COMPLIANCE ASSESSMENT:
Result: ${c.result}
Explanation: ${c.explanation}`);
  }

  return parts.join("\n\n");
}
