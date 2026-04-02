import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { combineTenderScores } from "@/lib/matching/score-tenders";
import type { BusinessProfile, Tender } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json(
      { error: "profileId is required" },
      { status: 400 }
    );
  }

  // 1. Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message || "Profile not found" },
      { status: 404 }
    );
  }

  // 2. Fetch ALL tenders (no regional pre-filter)
  const { data: tenders, error: tenderError } = await supabase
    .from("tenders")
    .select("*");

  if (tenderError) {
    return NextResponse.json(
      { error: tenderError.message },
      { status: 500 }
    );
  }

  // 3. Score tenders using multi-signal BM25 system
  const scored = combineTenderScores(
    profile as BusinessProfile,
    (tenders || []) as Tender[]
  );

  return NextResponse.json(scored);
}
