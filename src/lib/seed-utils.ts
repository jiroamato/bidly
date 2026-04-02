export function splitValues(val: string | undefined): string[] {
  if (!val || val.trim() === "") return [];
  return val
    .split(/[|\n]/)
    .map((s) => s.trim().replace(/^\*/, "").trim())
    .filter(Boolean);
}

// Backward-compatible alias
export const splitPipes = splitValues;

export function filterTenders(records: Record<string, string>[]): Record<string, string>[] {
  return records.filter((r) => {
    const title = r["title-titre-eng"]?.trim();
    return !!title;
  });
}

export function mapTenderRow(r: Record<string, string>, fallbackIndex: number) {
  return {
    reference_number: r["referenceNumber-numeroReference"] || `UNKNOWN-${fallbackIndex}`,
    solicitation_number: r["solicitationNumber-numeroSollicitation"] || "",
    title: r["title-titre-eng"] || "",
    description: r["tenderDescription-descriptionAppelOffres-eng"] || "",
    publication_date: r["publicationDate-datePublication"] || null,
    closing_date: r["tenderClosingDate-appelOffresDateCloture"] || null,
    status: r["tenderStatus-appelOffresStatut-eng"] || "",
    procurement_category: (r["procurementCategory-categorieApprovisionnement"] || "").replace(/^\*/, "").trim(),
    notice_type: r["noticeType-avisType-eng"] || "",
    procurement_method: r["procurementMethod-methodeApprovisionnement-eng"] || "",
    selection_criteria: r["selectionCriteria-criteresSelection-eng"] || "",
    gsin_codes: splitValues(r["gsin-nibs"]),
    unspsc_codes: splitValues(r["unspsc"]),
    regions_of_opportunity: splitValues(r["regionsOfOpportunity-regionAppelOffres-eng"]),
    regions_of_delivery: splitValues(r["regionsOfDelivery-regionsLivraison-eng"]),
    trade_agreements: splitValues(r["tradeAgreements-accordsCommerciaux-eng"]),
    contracting_entity: (r["contractingEntityName-nomEntitContractante-eng"] || "").replace(/^\*/, "").trim(),
    notice_url: r["noticeURL-URLavis-eng"] || "",
    attachment_urls: splitValues(r["attachment-piecesJointes-eng"]),
    raw_csv_data: r,
  };
}
