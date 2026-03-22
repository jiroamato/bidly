import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import { splitPipes, filterTenders, mapTenderRow } from "../src/lib/seed-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CSV_PATH = "./2025-2026-TenderNotice-AvisAppelOffres.csv";
const BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("Reading CSV...");
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
  console.log(`Parsed ${records.length} rows`);

  const filtered = filterTenders(records);
  console.log(`Filtered to ${filtered.length} active tenders`);

  // Take up to 500 tenders for hackathon
  const tenders = filtered.slice(0, 500);

  // Batch insert
  for (let i = 0; i < tenders.length; i += BATCH_SIZE) {
    const batch = tenders.slice(i, i + BATCH_SIZE).map((r) => mapTenderRow(r, i));

    const { error } = await supabase.from("tenders").upsert(batch, {
      onConflict: "reference_number",
    });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
    } else {
      console.log(`Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
    }
  }

  console.log("Done seeding tenders!");
}

main().catch(console.error);
