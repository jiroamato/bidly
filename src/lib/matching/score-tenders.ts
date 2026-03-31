import type { Tender, BusinessProfile } from "@/lib/types";
import type { ScoredTender } from "./types";
import { SCORING_WEIGHTS } from "./types";
import { scoreByKeywords, computeIdf } from "./keyword-scorer";

export function combineTenderScores(
  profile: BusinessProfile,
  tenders: Tender[],
  embeddingSimilarities: Map<number, number>
): ScoredTender[] {
  const keywords = profile.keywords || [];
  const synonyms = profile.keyword_synonyms || {};

  // Use equal weights (1.0 per keyword) for simple, intuitive scoring
  const equalIdf = new Map(keywords.map((k) => [k, 1.0]));
  const hasEmbeddings = embeddingSimilarities.size > 0;

  const scored: ScoredTender[] = tenders.map((tender) => {
    const tenderText = `${tender.title} ${tender.description}`;
    const keywordResult = scoreByKeywords(keywords, synonyms, tenderText, equalIdf);

    const similarity = embeddingSimilarities.get(tender.id) ?? 0;
    const embeddingScore = Math.round(Math.max(0, similarity) * 100);

    // When embeddings are available, blend both scores.
    // When no embeddings, use keyword score at full weight.
    const matchScore = hasEmbeddings
      ? Math.round(
          keywordResult.score * SCORING_WEIGHTS.keyword +
          embeddingScore * SCORING_WEIGHTS.embedding
        )
      : keywordResult.score;

    return {
      ...tender,
      match_score: matchScore,
      keyword_score: keywordResult.score,
      embedding_score: embeddingScore,
      matched_keywords: keywordResult.matchedKeywords,
    };
  });

  scored.sort((a, b) => b.match_score - a.match_score);
  return scored;
}
