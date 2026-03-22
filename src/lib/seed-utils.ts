export function splitPipes(val: string | undefined): string[] {
  if (!val || val.trim() === "") return [];
  return val.split("|").map((s) => s.trim()).filter(Boolean);
}

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
  };
}
