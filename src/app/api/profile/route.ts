import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { extractKeywordsFromCapabilities } from "./extract-keywords";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const id = request.nextUrl.searchParams.get("id");

  let query = supabase.from("business_profiles").select("*");
  if (id) {
    query = query.eq("id", Number(id));
  } else {
    query = query.order("id").limit(1);
  }

  const { data, error } = await query.single();
  if (error) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json(data);
}

// Allowlisted fields for business_profiles writes
const PROFILE_ALLOWED_FIELDS = [
  "company_name",
  "industry",
  "location",
  "province",
  "capabilities",
  "keywords",
  "insurance_amount",
  "certifications",
  "years_in_business",
  "past_gov_experience",
  "bonding_capacity",
  "security_clearance",
  "num_employees",
] as const;

function pickAllowedFields(body: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  for (const key of PROFILE_ALLOWED_FIELDS) {
    if (key in body) cleaned[key] = body[key];
  }
  return cleaned;
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowed = pickAllowedFields(body);

  const supabase = createServerClient();

  // Ensure keywords are populated — fall back to extracting from capabilities
  if ((!allowed.keywords || (allowed.keywords as string[]).length === 0) && allowed.capabilities) {
    allowed.keywords = extractKeywordsFromCapabilities(allowed.capabilities as string);
  }

  const { data, error } = await supabase
    .from("business_profiles")
    .insert(allowed)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create profile" }, { status: 400 });

  // Embed capabilities text for semantic matching
  if (data.capabilities && process.env.VOYAGE_API_KEY) {
    try {
      const { embedText } = await import("@/lib/matching/embed");
      const embedding = await embedText(data.capabilities);
      await supabase
        .from("business_profiles")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", data.id);
      data.embedding = embedding;
    } catch (err) {
      console.error("Failed to embed profile capabilities:", err);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("business_profiles").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, ...raw } = body;
  if (id === undefined) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates = pickAllowedFields(raw);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update profile" }, { status: 400 });

  // Re-embed if capabilities changed
  if (updates.capabilities && process.env.VOYAGE_API_KEY) {
    try {
      const { embedText } = await import("@/lib/matching/embed");
      const embedding = await embedText(data.capabilities);
      await supabase
        .from("business_profiles")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", data.id);
    } catch (err) {
      console.error("Failed to re-embed profile capabilities:", err);
    }
  }

  return NextResponse.json(data);
}
