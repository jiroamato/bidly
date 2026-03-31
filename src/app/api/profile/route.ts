import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { extractKeywordsFromCapabilities } from "./extract-keywords";

/**
 * Extract keywords from capabilities text when the AI extraction returns none.
 * Splits on commas, "and", and common filler phrases to find service descriptions.
 */
function extractKeywordsFromCapabilities(capabilities: string): string[] {
  if (!capabilities) return [];
  const phrases = capabilities
    .split(/,|\band\b|including|such as|also|our core|services include/i)
    .map((s) => s.trim().replace(/^(our|we|the|for)\s+/i, "").trim())
    .filter((s) => s.length > 3 && s.length < 80);
  return [...new Set(phrases)].slice(0, 15);
}

export async function GET() {
  const supabase = createServerClient();
  // For hackathon: return the first (demo) profile
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .order("id")
    .limit(1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Ensure keywords are populated — fall back to extracting from capabilities
  if ((!body.keywords || body.keywords.length === 0) && body.capabilities) {
    body.keywords = extractKeywordsFromCapabilities(body.capabilities);
  }

  const { data, error } = await supabase
    .from("business_profiles")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

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

export async function DELETE() {
  const supabase = createServerClient();
  const { error } = await supabase.from("business_profiles").delete().neq("id", 0);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, ...updates } = body;
  if (id === undefined) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

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
