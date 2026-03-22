import { createClient } from "@supabase/supabase-js";
import { getEmbeddings } from "../src/lib/voyage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 20; // Voyage free tier: max ~128 texts per call, keep small

async function main() {
  // Get IDs of tenders that already have embeddings
  const { data: existing } = await supabase
    .from("tender_embeddings")
    .select("tender_id");
  const embeddedIds = new Set((existing || []).map((e) => e.tender_id));

  // Get tenders that don't have embeddings yet
  const { data: allTenders, error } = await supabase
    .from("tenders")
    .select("id, title, description")
    .order("id");

  if (error) throw error;
  const tenders = allTenders.filter((t) => !embeddedIds.has(t.id));
  console.log(`Found ${allTenders.length} tenders, ${tenders.length} need embedding (${embeddedIds.size} already done)`);

  let embedded = 0;
  for (let i = 0; i < tenders.length; i += BATCH_SIZE) {
    const batch = tenders.slice(i, i + BATCH_SIZE);
    const texts = batch.map(
      (t) => `${t.title}\n\n${t.description}`.slice(0, 2000) // truncate long descriptions
    );

    try {
      const embeddings = await getEmbeddings(texts, "voyage-3-lite", "document");

      const rows = batch.map((t, idx) => ({
        tender_id: t.id,
        embedding: JSON.stringify(embeddings[idx]),
        chunk_text: texts[idx],
      }));

      const { error: insertError } = await supabase
        .from("tender_embeddings")
        .insert(rows);

      if (insertError) {
        console.error(`Batch ${i / BATCH_SIZE + 1} insert failed:`, insertError.message);
      } else {
        embedded += batch.length;
        console.log(`Embedded batch ${i / BATCH_SIZE + 1} (${embedded}/${tenders.length})`);
      }
    } catch (err) {
      console.error(`Batch ${i / BATCH_SIZE + 1} embedding failed, skipping:`, err);
    }

    // Rate limit: 300 RPM on free tier, so ~100ms between batches is safe
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nEmbedded ${embedded} tenders. Creating IVFFlat index...`);

  // Create IVFFlat index AFTER data is loaded (needs rows to build lists)
  const lists = Math.max(1, Math.floor(Math.sqrt(embedded)));
  const { error: indexError } = await supabase.rpc("exec_sql", {
    query: `create index if not exists tender_embeddings_ivfflat_idx
            on tender_embeddings
            using ivfflat (embedding vector_cosine_ops)
            with (lists = ${lists});`,
  });

  // If RPC doesn't exist, print the SQL for manual execution
  if (indexError) {
    console.log("\nRun this SQL manually in Supabase SQL Editor:");
    console.log(`CREATE INDEX IF NOT EXISTS tender_embeddings_ivfflat_idx
  ON tender_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = ${lists});`);
  } else {
    console.log("IVFFlat index created!");
  }

  console.log("Done!");
}

main().catch(console.error);
