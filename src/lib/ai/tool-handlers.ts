import { createServerClient } from "@/lib/supabase";

const supabase = createServerClient();

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  switch (toolName) {
    case "searchTenders":
      return await searchTenders(toolInput);
    case "getTenderDetails":
      return await getTenderDetails(toolInput);
    case "getCompanyProfile":
      return await getCompanyProfile(toolInput);
    case "saveProgress":
      return await saveProgress(toolInput);
    case "matchTendersToProfile":
      return await matchTendersToProfile(toolInput);
    case "filterTenders":
      return await filterTenders(toolInput);
    case "checkBuyCanadian":
      return checkBuyCanadian(toolInput);
    case "runComplianceAssessment":
      return JSON.stringify({
        note: "Run the compliance assessment based on the interview conversation. Evaluate each of the 6 sections and return a structured ComplianceAssessment.",
      });
    case "saveTenderSelection":
      return await saveTenderSelection(toolInput);
    case "saveAnalysis":
      return await saveAnalysis(toolInput);
    case "saveComplianceResult":
      return await saveComplianceResult(toolInput);
    case "saveDraft":
      return await saveDraft(toolInput);
    case "updateProfile":
      return await updateProfile(toolInput);
    case "getMatchContext":
      return await getMatchContext(toolInput);
    case "summarizeTender":
      return await getTenderDetails(toolInput); // Return raw data, AI summarizes
    case "getFormChecklist":
      return await getTenderDetails(toolInput); // AI extracts forms from description
    case "draftBidSection":
      return JSON.stringify({
        note: "Draft the section based on the profile and tender context provided in the conversation.",
      });
    case "explainForm":
      return JSON.stringify({
        note: "Explain the form based on your knowledge of Canadian procurement.",
      });
    case "calculatePricing":
      return calculatePricing(toolInput);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function searchTenders(input: Record<string, any>): Promise<string> {
  const { query, category, region, limit = 20 } = input;

  let q = supabase.from("tenders").select("*").order("closing_date", { ascending: true }).limit(limit);

  if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  if (category) q = q.eq("procurement_category", category);
  if (region) q = q.contains("regions_of_delivery", [region]);

  const { data, error } = await q;
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data || []);
}

async function getTenderDetails(input: Record<string, any>): Promise<string> {
  const { tender_id } = input;
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", tender_id)
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function getCompanyProfile(input: Record<string, any>): Promise<string> {
  const { profile_id } = input;
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", profile_id)
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function matchTendersToProfile(input: Record<string, any>): Promise<string> {
  const { profile_id, limit = 20 } = input;

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", profile_id)
    .single();

  if (profileError || !profile) {
    return JSON.stringify({ error: profileError?.message || "Profile not found" });
  }

  // Query tenders matching profile's province
  let q = supabase
    .from("tenders")
    .select("*")
    .contains("regions_of_delivery", [profile.province])
    .order("closing_date", { ascending: true })
    .limit(limit);

  const { data, error } = await q;
  if (error) return JSON.stringify({ error: error.message });

  // Score results by keyword overlap with title/description
  const keywords = (profile.keywords || []).map((k: string) => k.toLowerCase());
  const scored = (data || []).map((t: any) => {
    const text = `${t.title} ${t.description}`.toLowerCase();
    const matched = keywords.filter((k: string) => text.includes(k));
    return { ...t, match_score: matched.length > 0 ? Math.round((matched.length / Math.max(keywords.length, 1)) * 100) : 0, matched_keywords: matched };
  });
  scored.sort((a: any, b: any) => b.match_score - a.match_score);
  return JSON.stringify(scored);
}

async function filterTenders(input: Record<string, any>): Promise<string> {
  const { category, contracting_entity, status, closing_after, closing_before, limit = 20 } = input;

  let q = supabase.from("tenders").select("*");

  if (category) q = q.eq("procurement_category", category);
  if (contracting_entity) q = q.ilike("contracting_entity", `%${contracting_entity}%`);
  if (status) q = q.eq("status", status);
  if (closing_after) q = q.gte("closing_date", closing_after);
  if (closing_before) q = q.lte("closing_date", closing_before);

  q = q.order("closing_date", { ascending: true }).limit(limit);

  const { data, error } = await q;
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data || []);
}

function checkBuyCanadian(input: Record<string, any>): string {
  const { is_canadian, trade_agreements = [] } = input;

  if (is_canadian === true) {
    return JSON.stringify({
      status: "pass",
      hard_gate: false,
      message: "Company meets Buy Canadian policy requirements.",
      trade_agreements,
    });
  }

  if (is_canadian === false) {
    return JSON.stringify({
      status: "fail",
      hard_gate: true,
      message: "Company does not meet Buy Canadian policy. The company must be Canadian-owned to bid on this tender.",
      trade_agreements,
    });
  }

  return JSON.stringify({
    status: "pending",
    hard_gate: false,
    message: "Canadian ownership status is unknown. Please confirm whether the company is Canadian-owned.",
    trade_agreements,
  });
}

async function saveTenderSelection(input: Record<string, any>): Promise<string> {
  const { profile_id, tender_id, match_score, matched_keywords, match_reasoning } = input;

  const { data, error } = await supabase
    .from("tender_selections")
    .upsert(
      { profile_id, tender_id, match_score, matched_keywords, match_reasoning },
      { onConflict: "profile_id,tender_id" }
    )
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function saveAnalysis(input: Record<string, any>): Promise<string> {
  const { profile_id, tender_id, analysis } = input;

  const { data, error } = await supabase
    .from("tender_analyses")
    .upsert(
      { profile_id, tender_id, analysis },
      { onConflict: "profile_id,tender_id" }
    )
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function saveComplianceResult(input: Record<string, any>): Promise<string> {
  const { profile_id, tender_id, result, explanation } = input;

  const { data, error } = await supabase
    .from("eligibility_checks")
    .upsert(
      { profile_id, tender_id, result, explanation, responses: {}, documentation_checklist: [] },
      { onConflict: "profile_id,tender_id" }
    )
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function saveDraft(input: Record<string, any>): Promise<string> {
  const { profile_id, tender_id, section_type, content } = input;

  // Read existing draft to merge sections (upsert would overwrite the entire JSONB)
  const { data: existing } = await supabase
    .from("bid_drafts")
    .select("sections")
    .eq("profile_id", profile_id)
    .eq("tender_id", tender_id)
    .single();

  const mergedSections = { ...(existing?.sections || {}), [section_type]: content };

  const { data, error } = await supabase
    .from("bid_drafts")
    .upsert(
      { profile_id, tender_id, sections: mergedSections, status: "draft" },
      { onConflict: "profile_id,tender_id" }
    )
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function updateProfile(input: Record<string, any>): Promise<string> {
  const { profile_id, updates } = input;

  // Reject updates to protected fields
  const protectedFields = ["id", "created_at"];
  for (const field of protectedFields) {
    if (field in updates) {
      return JSON.stringify({ error: `Cannot update protected field: ${field}` });
    }
  }

  const { data, error } = await supabase
    .from("business_profiles")
    .update(updates)
    .eq("id", profile_id)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function getMatchContext(input: Record<string, any>): Promise<string> {
  const { profile_id, tender_id } = input;

  const { data, error } = await supabase
    .from("tender_selections")
    .select("*")
    .eq("profile_id", profile_id)
    .eq("tender_id", tender_id)
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function saveProgress(input: Record<string, any>): Promise<string> {
  const { type, data } = input;
  const tableMap: Record<string, string> = {
    profile: "business_profiles",
    eligibility: "eligibility_checks",
    draft: "bid_drafts",
    forms: "form_checklists",
  };

  const table = tableMap[type];
  if (!table) return JSON.stringify({ error: `Unknown save type: ${type}` });

  if (type === "profile") {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data)
      .select()
      .single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify(result);
  }

  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, { onConflict: "profile_id,tender_id" })
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(result);
}

function calculatePricing(input: Record<string, any>): string {
  const { line_items = [], province = "Ontario" } = input;
  const taxInfo: Record<string, { rate: number; label: string }> = {
    Ontario: { rate: 0.13, label: "HST (13.0%)" },
    "British Columbia": { rate: 0.12, label: "GST (5%) + PST (7%)" },
    Alberta: { rate: 0.05, label: "GST (5%)" },
    Quebec: { rate: 0.14975, label: "GST (5%) + QST (9.975%)" },
    "Nova Scotia": { rate: 0.15, label: "HST (15.0%)" },
    "New Brunswick": { rate: 0.15, label: "HST (15.0%)" },
    Manitoba: { rate: 0.12, label: "GST (5%) + PST (7%)" },
    Saskatchewan: { rate: 0.11, label: "GST (5%) + PST (6%)" },
    "Prince Edward Island": { rate: 0.15, label: "HST (15.0%)" },
    Newfoundland: { rate: 0.15, label: "HST (15.0%)" },
  };

  const { rate, label: tax_label } = taxInfo[province] || { rate: 0.13, label: "HST (13.0%)" };
  const subtotal = line_items.reduce(
    (sum: number, item: any) => sum + (item.amount || 0),
    0
  );
  const tax = subtotal * rate;

  return JSON.stringify({
    line_items,
    subtotal,
    tax_rate: rate,
    tax_label,
    tax_amount: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
    province,
  });
}
