import type { KeywordResult } from "./types";

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

export function computeIdf(
  keywords: string[],
  synonyms: Record<string, string[]>,
  tenderTexts: string[]
): Map<string, number> {
  const n = tenderTexts.length;
  if (n === 0) {
    return new Map(keywords.map((k) => [k, 1.0]));
  }

  const normalizedTexts = tenderTexts.map(normalize);
  const idfMap = new Map<string, number>();

  for (const keyword of keywords) {
    const terms = [keyword, ...(synonyms[keyword] || [])].map(normalize);
    let docCount = 0;

    for (const text of normalizedTexts) {
      if (terms.some((term) => text.includes(term))) {
        docCount++;
      }
    }

    if (docCount === 0) {
      idfMap.set(keyword, 1.0);
    } else {
      idfMap.set(keyword, Math.log(n / (1 + docCount)) / Math.log(n + 1));
    }
  }

  return idfMap;
}

export function scoreByKeywords(
  keywords: string[],
  synonyms: Record<string, string[]>,
  tenderText: string,
  idfMap: Map<string, number>
): KeywordResult {
  if (keywords.length === 0) {
    return { score: 0, matchedKeywords: [], details: [] };
  }

  const normalizedText = normalize(tenderText);
  const details: KeywordResult["details"] = [];
  const matchedKeywords: string[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const keyword of keywords) {
    const weight = idfMap.get(keyword) ?? 1.0;
    totalWeight += weight;

    const terms = [keyword, ...(synonyms[keyword] || [])].map(normalize);
    const matchedTerm = terms.find((term) => normalizedText.includes(term));

    if (matchedTerm) {
      matchedWeight += weight;
      matchedKeywords.push(keyword);
      details.push({
        keyword,
        matchedVia: matchedTerm,
        idfWeight: weight,
      });
    }
  }

  const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

  return { score, matchedKeywords, details };
}
