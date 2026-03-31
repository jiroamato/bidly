import { describe, it, expect } from "vitest";
import { splitValues, mapTenderRow } from "@/lib/seed-utils";

describe("splitValues", () => {
  it("returns empty array for undefined", () => {
    expect(splitValues(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(splitValues("")).toEqual([]);
    expect(splitValues("   ")).toEqual([]);
  });

  it("splits pipe-separated values (backward compat)", () => {
    expect(splitValues("Ontario|Quebec|BC")).toEqual(["Ontario", "Quebec", "BC"]);
  });

  it("splits newline-separated values with * prefix", () => {
    expect(splitValues("*Ontario\n*Quebec\n*British Columbia")).toEqual([
      "Ontario",
      "Quebec",
      "British Columbia",
    ]);
  });

  it("strips * prefix from single values", () => {
    expect(splitValues("*Canada")).toEqual(["Canada"]);
  });

  it("handles mixed whitespace and empty lines", () => {
    expect(splitValues("*Ontario\n\n*Quebec\n  ")).toEqual(["Ontario", "Quebec"]);
  });

  it("handles values without * prefix", () => {
    expect(splitValues("Ontario\nQuebec")).toEqual(["Ontario", "Quebec"]);
  });
});

describe("mapTenderRow", () => {
  it("maps new CSV column names correctly", () => {
    const row: Record<string, string> = {
      "referenceNumber-numeroReference": "REF-001",
      "solicitationNumber-numeroSollicitation": "SOL-001",
      "title-titre-eng": "Test Tender",
      "tenderDescription-descriptionAppelOffres-eng": "A description",
      "publicationDate-datePublication": "2026-03-01",
      "tenderClosingDate-appelOffresDateCloture": "2026-04-01",
      "tenderStatus-appelOffresStatut-eng": "Open",
      "procurementCategory-categorieApprovisionnement": "*SRV",
      "noticeType-avisType-eng": "RFP",
      "procurementMethod-methodeApprovisionnement-eng": "Competitive",
      "selectionCriteria-criteresSelection-eng": "Best value",
      "gsin-nibs": "*N7030\n*N7010",
      "unspsc": "*80101500",
      "regionsOfOpportunity-regionAppelOffres-eng": "*Canada\n*Ontario",
      "regionsOfDelivery-regionsLivraison-eng": "*National Capital Region (NCR)",
      "tradeAgreements-accordsCommerciaux-eng": "*CFTA\n*WTO-AGP",
      "contractingEntityName-nomEntitContractante-eng": "*Public Services and Procurement Canada",
      "noticeURL-URLavis-eng": "https://example.com",
      "attachment-piecesJointes-eng": "",
    };

    const result = mapTenderRow(row, 0);

    expect(result.reference_number).toBe("REF-001");
    expect(result.title).toBe("Test Tender");
    expect(result.gsin_codes).toEqual(["N7030", "N7010"]);
    expect(result.regions_of_opportunity).toEqual(["Canada", "Ontario"]);
    expect(result.regions_of_delivery).toEqual(["National Capital Region (NCR)"]);
    expect(result.trade_agreements).toEqual(["CFTA", "WTO-AGP"]);
    expect(result.contracting_entity).toBe("Public Services and Procurement Canada");
  });

  it("falls back gracefully for missing columns", () => {
    const result = mapTenderRow({}, 5);
    expect(result.reference_number).toBe("UNKNOWN-5");
    expect(result.regions_of_opportunity).toEqual([]);
    expect(result.contracting_entity).toBe("");
  });
});
