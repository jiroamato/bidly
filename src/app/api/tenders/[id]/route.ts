import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsedId = parseInt(id);
  if (Number.isNaN(parsedId)) {
    return NextResponse.json({ error: "Invalid tender id" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", parsedId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
