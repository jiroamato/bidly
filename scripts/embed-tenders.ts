import { createClient } from "@supabase/supabase-js";
import { VoyageAIClient } from "voyageai";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BATCH_SIZE = 128;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

async function main() {
  console.log("Fetching tenders without embeddings...");

  const { data: tenders, error } = await supabase
    .from("tenders")
    .select("id, title, description")
    .order("id");

  if (error || !tenders) {
    console.error("Failed to fetch tenders:", error?.message);
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from("tender_embeddings")
    .select("tender_id");

  const existingIds = new Set((existing || []).map((e) => e.tender_id));
  const toEmbed = tenders.filter((t) => !existingIds.has(t.id));

  console.log(`${tenders.length} total tenders, ${toEmbed.length} need embeddings`);

  if (toEmbed.length === 0) {
    console.log("All tenders already have embeddings. Done!");
    return;
  }

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    const texts = batch.map((t) => `${t.title} ${t.description}`);

    console.log(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} tenders)...`);

    const result = await voyage.embed({
      input: texts,
      model: "voyage-3",
    });

    const rows = batch.map((tender, idx) => ({
      tender_id: tender.id,
      embedding: JSON.stringify(result.data![idx].embedding),
    }));

    const { error: insertError } = await supabase
      .from("tender_embeddings")
      .upsert(rows, { onConflict: "tender_id" });

    if (insertError) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, insertError.message);
    } else {
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} done.`);
    }
  }

  console.log("Done embedding tenders!");
}

main().catch(console.error);
