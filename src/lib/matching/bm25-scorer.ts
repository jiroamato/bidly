const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "must",
  "our", "we", "you", "your", "their", "its", "his", "her", "this",
  "that", "these", "those", "it", "not", "no", "nor", "so", "if",
  "as", "up", "out", "about", "into", "over", "after", "also",
]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

export function tokenize(text: string): string[] {
  if (!text) return [];
  return normalize(text)
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

export class BM25Scorer {
  private docs: string[][];
  private avgDocLen: number;
  private docFreq: Map<string, number>;
  private n: number;
  private k1 = 1.5;
  private b = 0.75;

  constructor(documents: string[]) {
    this.docs = documents.map(tokenize);
    this.n = this.docs.length;
    this.avgDocLen =
      this.n > 0
        ? this.docs.reduce((sum, d) => sum + d.length, 0) / this.n
        : 0;

    this.docFreq = new Map();
    for (const doc of this.docs) {
      const seen = new Set<string>();
      for (const term of doc) {
        if (!seen.has(term)) {
          seen.add(term);
          this.docFreq.set(term, (this.docFreq.get(term) || 0) + 1);
        }
      }
    }
  }

  private idf(term: string): number {
    const df = this.docFreq.get(term) || 0;
    return Math.log((this.n - df + 0.5) / (df + 0.5) + 1);
  }

  private termFrequency(term: string, docTokens: string[]): number {
    let count = 0;
    for (const t of docTokens) {
      if (t === term) count++;
    }
    return count;
  }

  score(queryTerms: string[]): number[] {
    const normalizedQuery = queryTerms.map((t) => normalize(t).trim()).filter(Boolean);

    return this.docs.map((docTokens) => {
      let docScore = 0;
      const docLen = docTokens.length;

      for (const term of normalizedQuery) {
        const tf = this.termFrequency(term, docTokens);
        if (tf === 0) continue;

        const idfVal = this.idf(term);
        const numerator = tf * (this.k1 + 1);
        const denominator =
          tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLen));
        docScore += idfVal * (numerator / denominator);
      }

      return docScore;
    });
  }

  scoreNormalized(queryTerms: string[]): number[] {
    const raw = this.score(queryTerms);
    const maxScore = Math.max(...raw, 0);
    if (maxScore === 0) return raw.map(() => 0);
    return raw.map((s) => Math.round((s / maxScore) * 100));
  }

  getMatchedTerms(docIndex: number, queryTerms: string[]): string[] {
    if (docIndex < 0 || docIndex >= this.docs.length) return [];
    const docTokens = new Set(this.docs[docIndex]);
    return queryTerms.filter((t) => docTokens.has(normalize(t).trim()));
  }
}
