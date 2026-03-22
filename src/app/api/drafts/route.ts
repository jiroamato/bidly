import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");
  const tenderId = searchParams.get("tender_id");

  if (!profileId || !tenderId) {
    return NextResponse.json({ error: "profile_id and tender_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bid_drafts")
    .select("*")
    .eq("profile_id", parseInt(profileId))
    .eq("tender_id", parseInt(tenderId))
    .single();

  if (error) return NextResponse.json(null);
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
  const { data, error } = await supabase
    .from("bid_drafts")
    .upsert({ ...body, updated_at: new Date().toISOString() }, { onConflict: "profile_id,tender_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
