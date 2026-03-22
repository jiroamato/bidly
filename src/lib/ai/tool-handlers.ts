import { createClient } from "@supabase/supabase-js";
import { getEmbeddings } from "@/lib/voyage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    case "checkEligibility":
      return JSON.stringify({
        note: "Eligibility check is performed by the AI based on profile and tender data. Return your assessment directly.",
      });
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

  if (query) {
    // Vector similarity search
    const [embedding] = await getEmbeddings([query]);
    const { data, error } = await supabase.rpc("match_tenders", {
      query_embedding: JSON.stringify(embedding),
      match_count: limit,
    });

    if (error) return JSON.stringify({ error: error.message });

    // Fetch full tender details for matched IDs
    const tenderIds = data.map((d: any) => d.tender_id);
    const { data: tenders } = await supabase
      .from("tenders")
      .select("*")
      .in("id", tenderIds);

    // Merge similarity scores
    const results = tenders?.map((t: any) => ({
      ...t,
      match_score: Math.round(
        (data.find((d: any) => d.tender_id === t.id)?.similarity || 0) * 100
      ),
    }));

    results?.sort((a: any, b: any) => b.match_score - a.match_score);
    return JSON.stringify(results || []);
  }

  // Filter-based search
  let q = supabase.from("tenders").select("*").order("closing_date", { ascending: true }).limit(limit);

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

  // For other types, upsert by (profile_id, tender_id)
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
  const hstRates: Record<string, number> = {
    Ontario: 0.13,
    "British Columbia": 0.12,
    Alberta: 0.05,
    Quebec: 0.14975,
    "Nova Scotia": 0.15,
    "New Brunswick": 0.15,
    Manitoba: 0.12,
    Saskatchewan: 0.11,
    "Prince Edward Island": 0.15,
    Newfoundland: 0.15,
  };

  const rate = hstRates[province] || 0.13;
  const subtotal = line_items.reduce(
    (sum: number, item: any) => sum + (item.amount || 0),
    0
  );
  const tax = subtotal * rate;

  return JSON.stringify({
    line_items,
    subtotal,
    tax_rate: rate,
    tax_label: province === "Alberta" ? "GST (5%)" : `HST (${(rate * 100).toFixed(1)}%)`,
    tax_amount: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
    province,
  });
}
