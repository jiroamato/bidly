import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { combineTenderScores } from "@/lib/matching/score-tenders";
import type { BusinessProfile, Tender } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
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

  // 2. Fetch region-filtered tenders via Postgres function
  const { data: tenders, error: tenderError } = await supabase
    .rpc("tenders_by_region", { target_province: profile.province || "" });

  if (tenderError) {
    return NextResponse.json({ error: tenderError.message }, { status: 500 });
  }

  // 3. Fetch embedding similarities if profile has an embedding
  let embeddingSimilarities = new Map<number, number>();
  if (profile.embedding) {
    const { data: similarities } = await supabase
      .rpc("match_tenders_by_embedding", {
        query_embedding: JSON.stringify(profile.embedding),
        match_count: (tenders as Tender[]).length,
      });

    if (similarities) {
      for (const row of similarities) {
        embeddingSimilarities.set(row.tender_id, row.similarity);
      }
    }
  }

  // 4. Score tenders
  const scored = combineTenderScores(
    profile as BusinessProfile,
    (tenders || []) as Tender[],
    embeddingSimilarities
  );

  return NextResponse.json(scored);
}
