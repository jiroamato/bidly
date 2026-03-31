import type { Tender } from "@/lib/types";

export interface CategoryResult {
  score: number; // 0, 50, or 100
  profileCategories: string[];
  tenderCategory: string;
}

export interface LocationResult {
  score: number; // 0 or 100
}

export interface ScoredTender extends Tender {
  match_score: number; // 0-100 combined
  bm25_score: number; // 0-100
  category_score: number; // 0, 50, or 100
  synonym_score: number; // 0-100
  location_score: number; // 0 or 100
  matched_keywords: string[];
}

export const SCORING_WEIGHTS = {
  bm25: 0.45,
  category: 0.25,
  synonym: 0.15,
  location: 0.15,
} as const;
