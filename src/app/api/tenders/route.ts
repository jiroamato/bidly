import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const parsedLimit = parseInt(searchParams.get("limit") || "50");
  const limit = Number.isNaN(parsedLimit) ? 50 : parsedLimit;

  let query = supabase
    .from("tenders")
    .select("*")
    .order("closing_date", { ascending: true })
    .limit(limit);

  if (category) query = query.eq("procurement_category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
