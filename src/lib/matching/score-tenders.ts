import type { Tender, BusinessProfile } from "@/lib/types";
import type { ScoredTender } from "./types";
import { SCORING_WEIGHTS } from "./types";
import { BM25Scorer } from "./bm25-scorer";
import { scoreCategory } from "./category-matcher";
import { scoreLocation } from "./location-scorer";

function getTenderText(tender: Tender): string {
  return `${tender.title} ${tender.description} ${tender.selection_criteria}`;
}

export function combineTenderScores(
  profile: BusinessProfile,
  tenders: Tender[]
): ScoredTender[] {
  if (tenders.length === 0) return [];

  const keywords = profile.keywords || [];
  const synonyms = profile.keyword_synonyms || {};
  const naicsCodes = profile.naics_codes || [];
  const province = profile.province || "";

  if (keywords.length === 0) {
    return tenders.map((tender) => ({
      ...tender,
      match_score: 0,
      bm25_score: 0,
      category_score: 0,
      synonym_score: 0,
      location_score: 0,
      matched_keywords: [],
    }));
  }

  // Build BM25 corpus from all tender texts
  const tenderTexts = tenders.map(getTenderText);
  const scorer = new BM25Scorer(tenderTexts);

  // Primary BM25 scores using profile keywords
  const bm25Normalized = scorer.scoreNormalized(keywords);

  // Synonym-only BM25 scores (terms not already in keywords)
  const synonymTerms: string[] = [];
  for (const [, syns] of Object.entries(synonyms)) {
    for (const syn of syns) {
      const synWords = syn
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1);
      for (const word of synWords) {
        if (!keywords.some((k) => k.toLowerCase() === word)) {
          synonymTerms.push(word);
        }
      }
    }
  }
  const synonymNormalized =
    synonymTerms.length > 0
      ? scorer.scoreNormalized(synonymTerms)
      : tenders.map(() => 0);

  // Determine if category signal is available
  const categoryAvailable = naicsCodes.length > 0;

  // Calculate effective weights (redistribute if category unavailable)
  let weights: { bm25: number; category: number; synonym: number; location: number } = { ...SCORING_WEIGHTS };
  if (!categoryAvailable) {
    const redistributed = weights.category;
    const remaining = weights.bm25 + weights.synonym + weights.location;
    weights = {
      bm25: weights.bm25 + redistributed * (weights.bm25 / remaining),
      category: 0,
      synonym: weights.synonym + redistributed * (weights.synonym / remaining),
      location: weights.location + redistributed * (weights.location / remaining),
    };
  }

  const scored: ScoredTender[] = tenders.map((tender, i) => {
    const bm25Score = bm25Normalized[i];
    const categoryResult = categoryAvailable
      ? scoreCategory(naicsCodes, tender.procurement_category)
      : { score: 0, profileCategories: [], tenderCategory: tender.procurement_category };
    const locationResult = scoreLocation(province, tender.regions_of_delivery);
    const synonymScore = synonymNormalized[i];

    const matchScore = Math.round(
      bm25Score * weights.bm25 +
        categoryResult.score * weights.category +
        synonymScore * weights.synonym +
        locationResult.score * weights.location
    );

    const matchedTerms = scorer.getMatchedTerms(i, keywords);

    return {
      ...tender,
      match_score: matchScore,
      bm25_score: bm25Score,
      category_score: categoryResult.score,
      synonym_score: synonymScore,
      location_score: locationResult.score,
      matched_keywords: matchedTerms,
    };
  });

  scored.sort((a, b) => b.match_score - a.match_score);
  return scored;
}
