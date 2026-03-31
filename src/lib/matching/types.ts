import type { Tender } from "@/lib/types";

export interface KeywordMatchDetail {
  keyword: string;
  matchedVia: string; // the actual term that matched (could be a synonym)
  idfWeight: number;
}

export interface KeywordResult {
  score: number; // 0-100
  matchedKeywords: string[];
  details: KeywordMatchDetail[];
}

export interface EmbeddingResult {
  score: number; // 0-100 (cosine similarity * 100)
}

export interface ScoredTender extends Tender {
  match_score: number; // 0-100 combined
  keyword_score: number; // 0-100
  embedding_score: number; // 0-100
  matched_keywords: string[];
}

export const SCORING_WEIGHTS = {
  keyword: 0.4,
  embedding: 0.6,
} as const;
