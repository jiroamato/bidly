import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CSV_PATH = "./2025-2026-TenderNotice-AvisAppelOffres.csv";
const BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function splitPipes(val: string | undefined): string[] {
  if (!val || val.trim() === "") return [];
  return val.split("|").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  console.log("Reading CSV...");
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
  console.log(`Parsed ${records.length} rows`);

  // Filter: English title must exist (include expired/cancelled for demo data)
  const filtered = records.filter((r: Record<string, string>) => {
    const title = r["title-titre-eng"]?.trim();
    return !!title;
  });

  console.log(`Filtered to ${filtered.length} active tenders`);

  // Take up to 500 tenders for hackathon
  const tenders = filtered.slice(0, 500);

  // Batch insert
  for (let i = 0; i < tenders.length; i += BATCH_SIZE) {
    const batch = tenders.slice(i, i + BATCH_SIZE).map((r: Record<string, string>) => ({
      reference_number: r["referenceNumber-numeroReference"] || `UNKNOWN-${i}`,
      solicitation_number: r["solicitationNumber-numeroSollicitation"] || "",
      title: r["title-titre-eng"] || "",
      description: r["tenderDescription-descriptionAppelOffres-eng"] || "",
      publication_date: r["publicationDate-datePublication"] || null,
      closing_date: r["tenderClosingDate-appelOffresDateCloture"] || null,
      status: r["tenderStatus-appelOffresStatut-eng"] || "",
      procurement_category: r["procurementCategory-categorieApprovisionnement"] || "",
      notice_type: r["noticeType-avisType-eng"] || "",
      procurement_method: r["procurementMethod-methodeApprovisionnement-eng"] || "",
      selection_criteria: r["selectionCriteria-criteresSelection-eng"] || "",
      gsin_codes: splitPipes(r["gsin-nibs"]),
      unspsc_codes: splitPipes(r["unspsc"]),
      regions_of_opportunity: splitPipes(r["regionsOfOpportunity"]),
      regions_of_delivery: splitPipes(r["regionsOfDelivery"]),
      trade_agreements: splitPipes(r["tradeAgreements"]),
      contracting_entity: r["contractingEntityName"] || "",
      notice_url: r["noticeURL-URLavis-eng"] || "",
      attachment_urls: splitPipes(r["attachment-piecesJointes-eng"]),
      raw_csv_data: r,
    }));

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
