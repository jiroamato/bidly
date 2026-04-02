import { describe, it, expect } from "vitest";
import { splitPipes, filterTenders, mapTenderRow } from "../src/lib/seed-utils";

describe("splitPipes", () => {
  it("splits pipe-delimited values into trimmed array", () => {
    expect(splitPipes("Ontario|Quebec|BC")).toEqual(["Ontario", "Quebec", "BC"]);
  });

  it("trims whitespace around values", () => {
    expect(splitPipes(" Ontario | Quebec | BC ")).toEqual(["Ontario", "Quebec", "BC"]);
  });

  it("returns empty array for undefined", () => {
    expect(splitPipes(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(splitPipes("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(splitPipes("   ")).toEqual([]);
  });

  it("filters out empty segments from double pipes", () => {
    expect(splitPipes("Ontario||BC")).toEqual(["Ontario", "BC"]);
  });

  it("handles single value with no pipes", () => {
    expect(splitPipes("Ontario")).toEqual(["Ontario"]);
  });
});

describe("filterTenders", () => {
  it("keeps records with an English title", () => {
    const records = [
      { "title-titre-eng": "Some Tender" },
      { "title-titre-eng": "Another Tender" },
    ];
    expect(filterTenders(records)).toHaveLength(2);
  });

  it("removes records with empty title", () => {
    const records = [
      { "title-titre-eng": "" },
      { "title-titre-eng": "Valid" },
    ];
    expect(filterTenders(records)).toHaveLength(1);
    expect(filterTenders(records)[0]["title-titre-eng"]).toBe("Valid");
  });

  it("removes records with whitespace-only title", () => {
    const records = [{ "title-titre-eng": "   " }];
    expect(filterTenders(records)).toHaveLength(0);
  });

  it("removes records with missing title key", () => {
    const records = [{ "other-field": "value" }];
    expect(filterTenders(records)).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterTenders([])).toEqual([]);
  });
});

describe("mapTenderRow", () => {
  const fullRow: Record<string, string> = {
    "referenceNumber-numeroReference": "REF-001",
    "solicitationNumber-numeroSollicitation": "SOL-001",
    "title-titre-eng": "RCMP Cleaning",
    "tenderDescription-descriptionAppelOffres-eng": "Cleaning services needed",
    "publicationDate-datePublication": "2026-01-01",
    "tenderClosingDate-appelOffresDateCloture": "2026-03-01",
    "tenderStatus-appelOffresStatut-eng": "Open",
    "procurementCategory-categorieApprovisionnement": "SRV",
    "noticeType-avisType-eng": "RFP",
    "procurementMethod-methodeApprovisionnement-eng": "Competitive",
    "selectionCriteria-criteresSelection-eng": "Lowest price",
    "gsin-nibs": "N7610|N7620",
    "unspsc": "76111500",
    "regionsOfOpportunity-regionAppelOffres-eng": "Saskatchewan",
    "regionsOfDelivery-regionsLivraison-eng": "Saskatchewan",
    "tradeAgreements-accordsCommerciaux-eng": "CFTA|WTO-AGP",
    "contractingEntityName-nomEntitContractante-eng": "RCMP",
    "noticeURL-URLavis-eng": "https://example.com/tender",
    "attachment-piecesJointes-eng": "https://example.com/doc1|https://example.com/doc2",
  };

  it("maps all CSV columns to the correct DB fields", () => {
    const result = mapTenderRow(fullRow, 0);
    expect(result.reference_number).toBe("REF-001");
    expect(result.title).toBe("RCMP Cleaning");
    expect(result.description).toBe("Cleaning services needed");
    expect(result.status).toBe("Open");
    expect(result.contracting_entity).toBe("RCMP");
  });

  it("splits pipe-delimited fields into arrays", () => {
    const result = mapTenderRow(fullRow, 0);
    expect(result.gsin_codes).toEqual(["N7610", "N7620"]);
    expect(result.trade_agreements).toEqual(["CFTA", "WTO-AGP"]);
    expect(result.attachment_urls).toEqual([
      "https://example.com/doc1",
      "https://example.com/doc2",
    ]);
  });

  it("uses fallback reference number when missing", () => {
    const row = { ...fullRow };
    delete (row as Record<string, string>)["referenceNumber-numeroReference"];
    const result = mapTenderRow(row, 42);
    expect(result.reference_number).toBe("UNKNOWN-42");
  });

  it("defaults missing text fields to empty string", () => {
    const result = mapTenderRow({}, 0);
    expect(result.title).toBe("");
    expect(result.description).toBe("");
    expect(result.status).toBe("");
    expect(result.contracting_entity).toBe("");
  });

  it("defaults missing date fields to null", () => {
    const result = mapTenderRow({}, 0);
    expect(result.publication_date).toBeNull();
    expect(result.closing_date).toBeNull();
  });

  it("defaults missing array fields to empty arrays", () => {
    const result = mapTenderRow({}, 0);
    expect(result.gsin_codes).toEqual([]);
    expect(result.unspsc_codes).toEqual([]);
    expect(result.regions_of_opportunity).toEqual([]);
  });

  it("preserves raw CSV data", () => {
    const result = mapTenderRow(fullRow, 0);
    expect(result.raw_csv_data).toBe(fullRow);
  });
});
