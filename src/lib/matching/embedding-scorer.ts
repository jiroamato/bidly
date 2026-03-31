import type { EmbeddingResult } from "./types";

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export function scoreByEmbedding(
  profileEmbedding: number[] | null,
  tenderEmbedding: number[] | null
): EmbeddingResult {
  if (!profileEmbedding || !tenderEmbedding) {
    return { score: 0 };
  }

  const similarity = cosineSimilarity(profileEmbedding, tenderEmbedding);
  const score = Math.round(Math.max(0, similarity) * 100);
  return { score };
}
