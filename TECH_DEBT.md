# Technical Debt

## Scoring Pipeline

- **Vector similarity (embedding scorer) is not integrated into the scoring pipeline.**
  `src/lib/matching/embedding-scorer.ts` defines `scoreByEmbedding` and `cosineSimilarity` (with passing tests), but `score-tenders.ts` does not import or use them. The composite score only uses BM25, category, synonym, and location signals. Embedding-based scoring is effectively dead code.
