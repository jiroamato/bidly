# Scoring Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the keyword+embedding scoring system with a multi-signal BM25-based scorer that produces 80-95% for strong matches and 0-15% for irrelevant tenders.

**Architecture:** Four scoring signals (BM25 text relevance 45%, procurement category match 25%, synonym expansion 15%, location 15%) combined into a weighted sum. All tenders scored (no regional pre-filter). Embeddings removed from the scoring pipeline.

**Tech Stack:** TypeScript, Vitest, BM25 (custom implementation), Supabase (Postgres)

---

### Task 1: Update Scoring Types

**Files:**
- Modify: `src/lib/matching/types.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/matching/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { SCORING_WEIGHTS } from "@/lib/matching/types";

describe("SCORING_WEIGHTS", () => {
  it("has four signals that sum to 1.0", () => {
    const sum =
      SCORING_WEIGHTS.bm25 +
      SCORING_WEIGHTS.category +
      SCORING_WEIGHTS.synonym +
      SCORING_WEIGHTS.location;
    expect(sum).toBeCloseTo(1.0);
  });

  it("has correct individual weights", () => {
    expect(SCORING_WEIGHTS.bm25).toBe(0.45);
    expect(SCORING_WEIGHTS.category).toBe(0.25);
    expect(SCORING_WEIGHTS.synonym).toBe(0.15);
    expect(SCORING_WEIGHTS.location).toBe(0.15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/matching/types.test.ts`
Expected: FAIL — `SCORING_WEIGHTS` has `keyword` and `embedding`, not `bm25`, `category`, etc.

- [ ] **Step 3: Update types.ts**

Replace the full contents of `src/lib/matching/types.ts` with:

```typescript
import type { Tender } from "@/lib/types";

export interface BM25Result {
  score: number; // 0-100 normalized
  matchedTerms: string[];
}

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/matching/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/matching/types.ts src/__tests__/lib/matching/types.test.ts
git commit -m "refactor(matching): update scoring types for multi-signal BM25 system"
```

---

### Task 2: Implement BM25 Scorer

**Files:**
- Create: `src/lib/matching/bm25-scorer.ts`
- Create: `src/__tests__/lib/matching/bm25-scorer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/matching/bm25-scorer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { BM25Scorer, normalize, tokenize } from "@/lib/matching/bm25-scorer";

describe("normalize", () => {
  it("lowercases and trims", () => {
    expect(normalize("  Cloud Migration  ")).toBe("cloud migration");
  });

  it("strips punctuation", () => {
    expect(normalize("IT-consulting, Inc.")).toBe("itconsulting inc");
  });

  it("handles empty string", () => {
    expect(normalize("")).toBe("");
  });
});

describe("tokenize", () => {
  it("splits text into lowercase words", () => {
    expect(tokenize("Cloud Migration Services")).toEqual([
      "cloud",
      "migration",
      "services",
    ]);
  });

  it("removes stop words", () => {
    const tokens = tokenize("the software and support for our clients");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("and");
    expect(tokens).not.toContain("for");
    expect(tokens).not.toContain("our");
    expect(tokens).toContain("software");
    expect(tokens).toContain("support");
    expect(tokens).toContain("clients");
  });

  it("strips punctuation before tokenizing", () => {
    expect(tokenize("IT-consulting, Inc.")).toEqual(["itconsulting", "inc"]);
  });

  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("BM25Scorer", () => {
  const documents = [
    "Cybersecurity assessment for cloud infrastructure and IT security",
    "Office furniture supply and delivery services",
    "Software maintenance and technical support services",
    "Construction of highway bridge in northern Ontario",
    "IT consulting and cloud migration project management",
  ];

  it("scores a relevant query higher than irrelevant documents", () => {
    const scorer = new BM25Scorer(documents);
    const scores = scorer.score(["cybersecurity", "IT", "security", "cloud"]);

    // Doc 0 (cybersecurity + IT security + cloud) should score highest
    expect(scores[0]).toBeGreaterThan(scores[1]); // vs furniture
    expect(scores[0]).toBeGreaterThan(scores[3]); // vs construction
  });

  it("returns 0 for documents with no matching terms", () => {
    const scorer = new BM25Scorer(documents);
    const scores = scorer.score(["plumbing", "electrical", "hvac"]);

    for (const score of scores) {
      expect(score).toBe(0);
    }
  });

  it("normalizes scores to 0-100 range", () => {
    const scorer = new BM25Scorer(documents);
    const normalized = scorer.scoreNormalized(["cybersecurity", "IT", "cloud"]);

    // Best match should be 100
    const max = Math.max(...normalized);
    expect(max).toBe(100);

    // All scores should be 0-100
    for (const score of normalized) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("handles single document corpus", () => {
    const scorer = new BM25Scorer(["cybersecurity audit services"]);
    const normalized = scorer.scoreNormalized(["cybersecurity"]);
    expect(normalized[0]).toBe(100);
  });

  it("handles empty query", () => {
    const scorer = new BM25Scorer(documents);
    const normalized = scorer.scoreNormalized([]);
    for (const score of normalized) {
      expect(score).toBe(0);
    }
  });

  it("handles empty corpus", () => {
    const scorer = new BM25Scorer([]);
    const normalized = scorer.scoreNormalized(["cybersecurity"]);
    expect(normalized).toEqual([]);
  });

  it("returns matched terms for a document", () => {
    const scorer = new BM25Scorer(documents);
    const matched = scorer.getMatchedTerms(0, ["cybersecurity", "cloud", "python"]);
    expect(matched).toContain("cybersecurity");
    expect(matched).toContain("cloud");
    expect(matched).not.toContain("python");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/matching/bm25-scorer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement BM25 scorer**

Create `src/lib/matching/bm25-scorer.ts`:

```typescript
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

  /** Returns raw BM25 scores for each document. */
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

  /** Returns scores normalized to 0-100 (best match = 100). */
  scoreNormalized(queryTerms: string[]): number[] {
    const raw = this.score(queryTerms);
    const maxScore = Math.max(...raw, 0);
    if (maxScore === 0) return raw.map(() => 0);
    return raw.map((s) => Math.round((s / maxScore) * 100));
  }

  /** Returns which query terms appear in a given document. */
  getMatchedTerms(docIndex: number, queryTerms: string[]): string[] {
    if (docIndex < 0 || docIndex >= this.docs.length) return [];
    const docTokens = new Set(this.docs[docIndex]);
    return queryTerms.filter((t) => docTokens.has(normalize(t).trim()));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/matching/bm25-scorer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/matching/bm25-scorer.ts src/__tests__/lib/matching/bm25-scorer.test.ts
git commit -m "feat(matching): implement BM25 scorer with normalization"
```

---

### Task 3: Implement Category Matcher

**Files:**
- Create: `src/lib/matching/category-matcher.ts`
- Create: `src/__tests__/lib/matching/category-matcher.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/matching/category-matcher.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  naicsToCategories,
  scoreCategory,
} from "@/lib/matching/category-matcher";

describe("naicsToCategories", () => {
  it("maps IT NAICS codes to service categories", () => {
    const cats = naicsToCategories(["541510", "541511"]);
    expect(cats).toContain("Services");
    expect(cats).toContain("Professional Services");
  });

  it("maps construction NAICS codes", () => {
    const cats = naicsToCategories(["236220"]);
    expect(cats).toContain("Construction");
  });

  it("maps manufacturing NAICS codes", () => {
    const cats = naicsToCategories(["334110"]);
    expect(cats).toContain("Goods");
  });

  it("returns empty array for unknown codes", () => {
    const cats = naicsToCategories(["999999"]);
    expect(cats).toEqual([]);
  });

  it("deduplicates categories from multiple codes", () => {
    const cats = naicsToCategories(["541510", "541611"]);
    const serviceCount = cats.filter((c) => c === "Services").length;
    expect(serviceCount).toBe(1);
  });

  it("handles empty array", () => {
    expect(naicsToCategories([])).toEqual([]);
  });
});

describe("scoreCategory", () => {
  it("returns 100 for exact category match", () => {
    const result = scoreCategory(["541510"], "Services");
    expect(result.score).toBe(100);
  });

  it("returns 50 for partial match (substring)", () => {
    const result = scoreCategory(["541510"], "Professional Services");
    expect(result.score).toBe(50);
  });

  it("returns 0 for no match", () => {
    const result = scoreCategory(["541510"], "Construction");
    expect(result.score).toBe(0);
  });

  it("returns 0 when profile has no NAICS codes", () => {
    const result = scoreCategory([], "Services");
    expect(result.score).toBe(0);
  });

  it("returns 0 when tender has empty category", () => {
    const result = scoreCategory(["541510"], "");
    expect(result.score).toBe(0);
  });

  it("matches case-insensitively", () => {
    const result = scoreCategory(["541510"], "services");
    expect(result.score).toBe(100);
  });

  it("matches SRV procurement code to Services", () => {
    const result = scoreCategory(["541510"], "SRV");
    expect(result.score).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/matching/category-matcher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement category matcher**

Create `src/lib/matching/category-matcher.ts`:

```typescript
import type { CategoryResult } from "./types";

/**
 * Maps 2-digit NAICS prefixes to expected procurement categories.
 * Based on Canadian government procurement category conventions.
 */
const NAICS_TO_CATEGORIES: Record<string, string[]> = {
  "11": ["Goods", "Agriculture"],
  "21": ["Goods", "Mining"],
  "22": ["Services", "Utilities"],
  "23": ["Construction"],
  "31": ["Goods", "Manufacturing"],
  "32": ["Goods", "Manufacturing"],
  "33": ["Goods", "Manufacturing"],
  "41": ["Goods", "Wholesale"],
  "42": ["Goods", "Wholesale"],
  "44": ["Goods", "Retail"],
  "45": ["Goods", "Retail"],
  "48": ["Services", "Transportation"],
  "49": ["Services", "Transportation"],
  "51": ["Services", "IT Services", "Professional Services"],
  "52": ["Services", "Financial Services"],
  "53": ["Services", "Real Estate"],
  "54": ["Services", "Professional Services"],
  "55": ["Services", "Management"],
  "56": ["Services", "Administrative Services"],
  "61": ["Services", "Education"],
  "62": ["Services", "Healthcare"],
  "71": ["Services", "Arts and Recreation"],
  "72": ["Services", "Accommodation"],
  "81": ["Services", "Repair and Maintenance"],
  "91": ["Services", "Public Administration"],
  "92": ["Services", "Public Administration"],
};

/**
 * Maps common procurement category codes to full names.
 * Canadian government tenders use short codes like "SRV", "GDS", etc.
 */
const PROCUREMENT_CODE_MAP: Record<string, string[]> = {
  srv: ["services"],
  gds: ["goods"],
  con: ["construction"],
};

export function naicsToCategories(naicsCodes: string[]): string[] {
  const categories = new Set<string>();
  for (const code of naicsCodes) {
    const prefix = code.slice(0, 2);
    const mapped = NAICS_TO_CATEGORIES[prefix];
    if (mapped) {
      for (const cat of mapped) {
        categories.add(cat);
      }
    }
  }
  return [...categories];
}

export function scoreCategory(
  naicsCodes: string[],
  tenderCategory: string
): CategoryResult {
  const profileCategories = naicsToCategories(naicsCodes);

  if (profileCategories.length === 0 || !tenderCategory) {
    return { score: 0, profileCategories, tenderCategory };
  }

  const normalizedTender = tenderCategory.toLowerCase().trim();

  // Check if tender category is a short code and expand it
  const expandedTenderCategories = PROCUREMENT_CODE_MAP[normalizedTender] || [
    normalizedTender,
  ];

  // Exact match: profile category matches tender category
  for (const profileCat of profileCategories) {
    const normalizedProfile = profileCat.toLowerCase();
    for (const tenderCat of expandedTenderCategories) {
      if (normalizedProfile === tenderCat) {
        return { score: 100, profileCategories, tenderCategory };
      }
    }
  }

  // Partial match: one contains the other
  for (const profileCat of profileCategories) {
    const normalizedProfile = profileCat.toLowerCase();
    for (const tenderCat of expandedTenderCategories) {
      if (
        normalizedProfile.includes(tenderCat) ||
        tenderCat.includes(normalizedProfile)
      ) {
        return { score: 50, profileCategories, tenderCategory };
      }
    }
  }

  return { score: 0, profileCategories, tenderCategory };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/matching/category-matcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/matching/category-matcher.ts src/__tests__/lib/matching/category-matcher.test.ts
git commit -m "feat(matching): implement NAICS-to-category procurement matcher"
```

---

### Task 4: Implement Location Scorer

**Files:**
- Create: `src/lib/matching/location-scorer.ts`
- Create: `src/__tests__/lib/matching/location-scorer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/matching/location-scorer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { scoreLocation } from "@/lib/matching/location-scorer";

describe("scoreLocation", () => {
  it("returns 100 when tender delivers to profile province", () => {
    const result = scoreLocation("Ontario", [
      "Ontario (except NCR)",
      "Quebec",
    ]);
    expect(result.score).toBe(100);
  });

  it("returns 100 for national scope (Canada)", () => {
    const result = scoreLocation("Ontario", ["Canada"]);
    expect(result.score).toBe(100);
  });

  it("returns 0 when province does not match", () => {
    const result = scoreLocation("Ontario", ["Alberta", "British Columbia"]);
    expect(result.score).toBe(0);
  });

  it("is case-insensitive", () => {
    const result = scoreLocation("ontario", ["ONTARIO"]);
    expect(result.score).toBe(100);
  });

  it("returns 0 for empty regions array", () => {
    const result = scoreLocation("Ontario", []);
    expect(result.score).toBe(0);
  });

  it("returns 0 for empty province", () => {
    const result = scoreLocation("", ["Ontario"]);
    expect(result.score).toBe(0);
  });

  it("matches substring (e.g., 'Ontario' in 'Ontario (except NCR)')", () => {
    const result = scoreLocation("Ontario", ["Ontario (except NCR)"]);
    expect(result.score).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/matching/location-scorer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement location scorer**

Create `src/lib/matching/location-scorer.ts`:

```typescript
import type { LocationResult } from "./types";

export function scoreLocation(
  profileProvince: string,
  regionsOfDelivery: string[]
): LocationResult {
  if (!profileProvince || regionsOfDelivery.length === 0) {
    return { score: 0 };
  }

  const province = profileProvince.toLowerCase();

  for (const region of regionsOfDelivery) {
    const normalizedRegion = region.toLowerCase();
    if (
      normalizedRegion.includes(province) ||
      normalizedRegion.includes("canada")
    ) {
      return { score: 100 };
    }
  }

  return { score: 0 };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/matching/location-scorer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/matching/location-scorer.ts src/__tests__/lib/matching/location-scorer.test.ts
git commit -m "feat(matching): implement location scorer"
```

---

### Task 5: Rewrite Score Combiner

**Files:**
- Modify: `src/lib/matching/score-tenders.ts`
- Rewrite: `src/__tests__/lib/matching/score-tenders.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace `src/__tests__/lib/matching/score-tenders.test.ts` with:

```typescript
import { describe, it, expect } from "vitest";
import { combineTenderScores } from "@/lib/matching/score-tenders";
import type { Tender, BusinessProfile } from "@/lib/types";

function makeTender(overrides: Partial<Tender> = {}): Tender {
  return {
    id: 1,
    reference_number: "REF-001",
    solicitation_number: "SOL-001",
    title: "Cybersecurity assessment for cloud infrastructure",
    description:
      "Looking for IT security and cloud migration expertise with software support",
    publication_date: "2026-03-01",
    closing_date: "2026-04-15",
    status: "Open",
    procurement_category: "SRV",
    notice_type: "RFP",
    procurement_method: "Competitive",
    selection_criteria: "cybersecurity experience required",
    gsin_codes: [],
    unspsc_codes: [],
    regions_of_opportunity: ["Ontario"],
    regions_of_delivery: ["Ontario (except NCR)"],
    trade_agreements: [],
    contracting_entity: "DND",
    notice_url: "",
    attachment_urls: [],
    ...overrides,
  };
}

function makeProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: 1,
    company_name: "Northpoint Digital Solutions",
    naics_codes: ["541510"],
    location: "Ottawa",
    province: "Ontario",
    capabilities: "IT consulting and cybersecurity",
    keywords: ["cybersecurity", "cloud", "migration", "IT", "security", "software", "support"],
    keyword_synonyms: {
      cybersecurity: ["cyber security", "IT security", "infosec"],
    },
    embedding: null,
    insurance_amount: "",
    bonding_limit: null,
    certifications: [],
    years_in_business: null,
    past_gov_experience: "",
    pbn: "",
    is_canadian: true,
    security_clearance: "",
    project_size_min: null,
    project_size_max: null,
    created_at: "2026-03-30",
    ...overrides,
  };
}

describe("combineTenderScores", () => {
  it("scores a highly relevant tender above 80%", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender(),
      makeTender({
        id: 2,
        title: "Furniture delivery",
        description: "office furniture supply",
        procurement_category: "GDS",
        regions_of_delivery: ["Alberta"],
        selection_criteria: "",
      }),
    ];

    const result = combineTenderScores(profile, tenders);

    const cyber = result.find((r) => r.id === 1)!;
    expect(cyber.match_score).toBeGreaterThanOrEqual(80);
    expect(cyber.matched_keywords.length).toBeGreaterThan(0);
  });

  it("scores an irrelevant tender below 25%", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender({
        id: 1,
        title: "Agricultural equipment maintenance",
        description: "tractor repair and farm equipment servicing",
        procurement_category: "GDS",
        regions_of_delivery: ["Saskatchewan"],
        selection_criteria: "farming experience required",
      }),
    ];

    const result = combineTenderScores(profile, tenders);
    expect(result[0].match_score).toBeLessThan(25);
  });

  it("sorts by match_score descending", () => {
    const profile = makeProfile();
    const tenders = [
      makeTender({
        id: 1,
        title: "Furniture delivery",
        description: "office furniture supply",
        procurement_category: "GDS",
        regions_of_delivery: ["Alberta"],
        selection_criteria: "",
      }),
      makeTender({
        id: 2,
        title: "Cybersecurity audit and IT security assessment",
        description:
          "cloud security migration software support services",
        procurement_category: "SRV",
        regions_of_delivery: ["Ontario"],
        selection_criteria: "cybersecurity certification required",
      }),
    ];

    const result = combineTenderScores(profile, tenders);
    expect(result[0].id).toBe(2);
    expect(result[0].match_score).toBeGreaterThan(result[1].match_score);
  });

  it("gives location bonus to same-province tenders", () => {
    const profile = makeProfile();
    const ontarioTender = makeTender({
      id: 1,
      title: "IT consulting services",
      description: "software development",
      regions_of_delivery: ["Ontario"],
    });
    const albertaTender = makeTender({
      id: 2,
      title: "IT consulting services",
      description: "software development",
      regions_of_delivery: ["Alberta"],
    });

    const result = combineTenderScores(profile, [ontarioTender, albertaTender]);
    const ontario = result.find((r) => r.id === 1)!;
    const alberta = result.find((r) => r.id === 2)!;
    expect(ontario.match_score).toBeGreaterThan(alberta.match_score);
    expect(ontario.location_score).toBe(100);
    expect(alberta.location_score).toBe(0);
  });

  it("returns 0 for everything when profile has no keywords", () => {
    const profile = makeProfile({
      keywords: [],
      keyword_synonyms: {},
      naics_codes: [],
    });
    const tenders = [makeTender()];

    const result = combineTenderScores(profile, tenders);
    expect(result[0].match_score).toBe(0);
  });

  it("includes national (Canada) tenders in location scoring", () => {
    const profile = makeProfile();
    const tender = makeTender({
      regions_of_delivery: ["Canada"],
    });

    const result = combineTenderScores(profile, [tender]);
    expect(result[0].location_score).toBe(100);
  });

  it("redistributes weight when profile has no NAICS codes", () => {
    const profile = makeProfile({ naics_codes: [] });
    const tenders = [makeTender()];

    const result = combineTenderScores(profile, tenders);
    // Score should still be meaningful from BM25 + synonym + location
    // Without category (25%), other weights scale up proportionally
    expect(result[0].match_score).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/matching/score-tenders.test.ts`
Expected: FAIL — `combineTenderScores` has wrong signature (expects `embeddingSimilarities` param)

- [ ] **Step 3: Rewrite score-tenders.ts**

Replace `src/lib/matching/score-tenders.ts` with:

```typescript
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
  for (const [keyword, syns] of Object.entries(synonyms)) {
    for (const syn of syns) {
      // Split multi-word synonyms into individual terms
      const synWords = syn
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1);
      for (const word of synWords) {
        // Only add if not already a keyword
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
  let weights = { ...SCORING_WEIGHTS };
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/matching/score-tenders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/matching/score-tenders.ts src/__tests__/lib/matching/score-tenders.test.ts
git commit -m "feat(matching): rewrite score combiner with 4-signal BM25 system"
```

---

### Task 6: Simplify Match API Route

**Files:**
- Modify: `src/app/api/tenders/match/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/app/api/tenders/match/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/tenders/match/route";
import { NextRequest } from "next/server";

// Mock supabase
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// Mock score-tenders
vi.mock("@/lib/matching/score-tenders", () => ({
  combineTenderScores: vi.fn(() => []),
}));

describe("GET /api/tenders/match", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when profileId is missing", async () => {
    const req = new NextRequest("http://localhost/api/tenders/match");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("fetches all tenders without region filter", async () => {
    mockSingle.mockResolvedValue({
      data: { id: 1, province: "Ontario", keywords: ["IT"] },
      error: null,
    });
    // Mock the tenders query (select all, not RPC)
    const mockTenderSelect = vi.fn(() => ({
      data: [{ id: 1, title: "Test" }],
      error: null,
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === "business_profiles") {
        return { select: mockSelect };
      }
      if (table === "tenders") {
        return { select: mockTenderSelect };
      }
    });

    const req = new NextRequest(
      "http://localhost/api/tenders/match?profileId=1"
    );
    await GET(req);

    // Should query tenders table directly, NOT use tenders_by_region RPC
    expect(mockRpc).not.toHaveBeenCalledWith("tenders_by_region", expect.anything());
    expect(mockRpc).not.toHaveBeenCalledWith("match_tenders_by_embedding", expect.anything());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/app/api/tenders/match/route.test.ts`
Expected: FAIL — route still calls `tenders_by_region` RPC

- [ ] **Step 3: Simplify the match route**

Replace `src/app/api/tenders/match/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { combineTenderScores } from "@/lib/matching/score-tenders";
import type { BusinessProfile, Tender } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json(
      { error: "profileId is required" },
      { status: 400 }
    );
  }

  // 1. Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message || "Profile not found" },
      { status: 404 }
    );
  }

  // 2. Fetch ALL tenders (no regional pre-filter)
  const { data: tenders, error: tenderError } = await supabase
    .from("tenders")
    .select("*");

  if (tenderError) {
    return NextResponse.json(
      { error: tenderError.message },
      { status: 500 }
    );
  }

  // 3. Score tenders using multi-signal BM25 system
  const scored = combineTenderScores(
    profile as BusinessProfile,
    (tenders || []) as Tender[]
  );

  return NextResponse.json(scored);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/app/api/tenders/match/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tenders/match/route.ts src/__tests__/app/api/tenders/match/route.test.ts
git commit -m "refactor(matching): simplify match route — remove embedding and region RPCs"
```

---

### Task 7: Update Keyword Extraction

**Files:**
- Modify: `src/app/api/profile/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/app/api/profile/extract-keywords.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractKeywordsFromCapabilities } from "@/app/api/profile/extract-keywords";

describe("extractKeywordsFromCapabilities", () => {
  it("splits long phrases into atomic terms", () => {
    const result = extractKeywordsFromCapabilities(
      "software maintenance and support, IT systems management"
    );
    expect(result).toContain("software");
    expect(result).toContain("maintenance");
    expect(result).toContain("support");
    expect(result).toContain("systems");
    expect(result).toContain("management");
    // Should NOT contain stop words
    expect(result).not.toContain("and");
    expect(result).not.toContain("the");
  });

  it("preserves IT as a keyword", () => {
    const result = extractKeywordsFromCapabilities("IT consulting services");
    expect(result).toContain("consulting");
    expect(result).toContain("services");
  });

  it("deduplicates terms", () => {
    const result = extractKeywordsFromCapabilities(
      "software support, software maintenance, software development"
    );
    const softwareCount = result.filter((k) => k === "software").length;
    expect(softwareCount).toBe(1);
  });

  it("returns empty array for empty input", () => {
    expect(extractKeywordsFromCapabilities("")).toEqual([]);
  });

  it("limits to 50 terms", () => {
    const longCapabilities = Array.from(
      { length: 100 },
      (_, i) => `keyword${i}`
    ).join(", ");
    const result = extractKeywordsFromCapabilities(longCapabilities);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("filters out very short words (1-2 chars) except known acronyms", () => {
    const result = extractKeywordsFromCapabilities("IT is a top service");
    expect(result).not.toContain("is");
    expect(result).not.toContain("a");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/app/api/profile/extract-keywords.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Extract and rewrite keyword extraction**

Create `src/app/api/profile/extract-keywords.ts`:

```typescript
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "our", "we", "you", "your",
  "their", "its", "his", "her", "this", "that", "these", "those", "it",
  "not", "no", "also", "including", "such", "as",
]);

const KNOWN_ACRONYMS = new Set(["it", "ai", "ml", "hr", "qa", "ui", "ux"]);

export function extractKeywordsFromCapabilities(
  capabilities: string
): string[] {
  if (!capabilities) return [];

  // Split on delimiters into phrases
  const phrases = capabilities
    .split(/,|\band\b|including|such as|also|our core|services include/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Split each phrase into individual words
  const words: string[] = [];
  for (const phrase of phrases) {
    const tokens = phrase
      .replace(/[^\w\s]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    words.push(...tokens);
  }

  // Filter: remove stop words and very short words (unless known acronym)
  const filtered = words.filter((w) => {
    if (STOP_WORDS.has(w)) return false;
    if (w.length <= 2 && !KNOWN_ACRONYMS.has(w)) return false;
    return true;
  });

  // Deduplicate and limit
  return [...new Set(filtered)].slice(0, 50);
}
```

- [ ] **Step 4: Update profile route.ts to use new extraction**

In `src/app/api/profile/route.ts`, replace the old `extractKeywordsFromCapabilities` function import. Change lines 7-15 from the inline function to an import:

Replace the function definition at the top:
```typescript
// DELETE the old extractKeywordsFromCapabilities function (lines 7-15)
```

Add the import at the top of the file:
```typescript
import { extractKeywordsFromCapabilities } from "./extract-keywords";
```

Also remove the Voyage AI embedding code from the POST handler (lines 55-66) and the PUT handler (lines 104-113). Remove the embedding-related try/catch blocks entirely. The profile still saves but no longer generates embeddings.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/app/api/profile/extract-keywords.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/profile/extract-keywords.ts src/app/api/profile/route.ts src/__tests__/app/api/profile/extract-keywords.test.ts
git commit -m "refactor(profile): extract atomic keywords instead of full phrases"
```

---

### Task 8: Update AI Profile Prompt

**Files:**
- Modify: `src/lib/ai/prompts.ts`

- [ ] **Step 1: Update the profile prompt**

In `src/lib/ai/prompts.ts`, find the profile prompt section (around line 18-26). Change the line about keyword extraction from:

```
3. Services/capabilities — free text. After they describe their services, infer NAICS codes and present them to the user for confirmation. Also extract relevant keywords.
```

To:

```
3. Services/capabilities — free text. After they describe their services, infer NAICS codes and present them to the user for confirmation. Also extract individual keywords (single words or two-word terms like "cybersecurity", "cloud", "migration", "consulting", "software", "project management"). Do NOT use long phrases — break capabilities into atomic search terms.
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/prompts.ts
git commit -m "refactor(profile): update AI prompt to extract atomic keywords"
```

---

### Task 9: Update ScoredTender Consumers

**Files:**
- Modify: `src/components/views/scout-view.tsx:13-18`
- Modify: `src/lib/ai/tool-handlers.ts:111-135`

- [ ] **Step 1: Update scout-view.tsx type**

In `src/components/views/scout-view.tsx`, replace the `TenderWithScore` type (lines 13-18):

```typescript
// OLD:
type TenderWithScore = Tender & {
  match_score: number;
  keyword_score: number;
  embedding_score: number;
  matched_keywords: string[];
};

// NEW:
type TenderWithScore = Tender & {
  match_score: number;
  bm25_score: number;
  category_score: number;
  synonym_score: number;
  location_score: number;
  matched_keywords: string[];
};
```

Also search within `scout-view.tsx` for any references to `keyword_score` or `embedding_score` and update them.

- [ ] **Step 2: Update tool-handlers.ts**

In `src/lib/ai/tool-handlers.ts`, replace lines 111-135 (the tender matching logic):

```typescript
// OLD (lines 111-135):
// Fetch region-filtered tenders via Postgres function
const { data: tenders, error: tenderError } = await supabase
  .rpc("tenders_by_region", { target_province: profile.province || "" });

if (tenderError) return JSON.stringify({ error: tenderError.message });

// Fetch embedding similarities if profile has an embedding
let embeddingSimilarities = new Map<number, number>();
if (profile.embedding) {
  const { data: similarities } = await supabase
    .rpc("match_tenders_by_embedding", {
      query_embedding: JSON.stringify(profile.embedding),
      match_count: (tenders || []).length,
    });

  if (similarities) {
    for (const row of similarities) {
      embeddingSimilarities.set(row.tender_id, row.similarity);
    }
  }
}

// Score using shared module
const { combineTenderScores } = await import("@/lib/matching/score-tenders");
const scored = combineTenderScores(profile, tenders || [], embeddingSimilarities);

// NEW:
// Fetch ALL tenders (no regional pre-filter)
const { data: tenders, error: tenderError } = await supabase
  .from("tenders")
  .select("*");

if (tenderError) return JSON.stringify({ error: tenderError.message });

// Score using shared module
const { combineTenderScores } = await import("@/lib/matching/score-tenders");
const scored = combineTenderScores(profile, tenders || []);
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/views/scout-view.tsx src/lib/ai/tool-handlers.ts
git commit -m "refactor(matching): update scout-view and tool-handlers for new scoring types"
```

---

### Task 10: Run Full Test Suite and Fix

**Files:**
- All test files

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`

- [ ] **Step 2: Fix any failing tests**

Old tests in `src/__tests__/lib/matching/keyword-scorer.test.ts` reference the old `computeIdf` and `scoreByKeywords` functions which no longer exist in the rewritten `keyword-scorer.ts`. Since the BM25 scorer replaces this file's functionality, either:

Option A: Delete `src/__tests__/lib/matching/keyword-scorer.test.ts` and `src/lib/matching/keyword-scorer.ts` if no other code imports them.

Option B: If other code still imports `normalize` from `keyword-scorer.ts`, keep only the `normalize` function and its tests. The `normalize` function is now also in `bm25-scorer.ts`, so check for duplicate imports.

Run: `grep -r "keyword-scorer" src/ --include="*.ts" --include="*.tsx" -l`

If only `score-tenders.ts` imported it (and that's been rewritten), delete both files.

- [ ] **Step 3: Run tests again to confirm all pass**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(matching): clean up old keyword scorer and fix test suite"
```

---

### Task 11: Clean Up Removed Files

**Files:**
- Delete: `src/lib/matching/embedding-scorer.ts`
- Delete: `src/lib/matching/keyword-scorer.ts` (if no other imports remain)
- Delete: `src/__tests__/lib/matching/keyword-scorer.test.ts`

- [ ] **Step 1: Check for remaining imports**

Run: `grep -r "embedding-scorer\|keyword-scorer\|embedText\|embedTexts" src/ --include="*.ts" --include="*.tsx" -l`

If `keyword-scorer` is not imported by any remaining file, delete it. If `embedding-scorer` is not imported, delete it. The `embed.ts` file can stay (it's used by profile creation for embedding storage, though we removed the scoring use — check if profile route still imports it after Task 7 changes).

- [ ] **Step 2: Delete unused files**

```bash
rm src/lib/matching/embedding-scorer.ts
rm src/__tests__/lib/matching/keyword-scorer.test.ts
# Only delete keyword-scorer.ts if no remaining imports:
rm src/lib/matching/keyword-scorer.ts
```

- [ ] **Step 3: Verify compilation and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(matching): remove unused embedding-scorer and keyword-scorer"
```

---

### Task 12: End-to-End Smoke Test

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Test the match endpoint manually**

Open browser or use curl:
```bash
curl "http://localhost:3000/api/tenders/match?profileId=1" | jq '.[0:3] | .[] | {title, match_score, bm25_score, category_score, synonym_score, location_score, matched_keywords}'
```

Verify:
- Scores are in 0-100 range
- IT-related tenders score higher than unrelated ones
- The top match scores 80+ for an IT company profile
- Location signal shows 100 for same-province tenders
- `matched_keywords` array is populated

- [ ] **Step 3: Commit any fixes needed**

```bash
git add -A
git commit -m "fix(matching): address issues found in smoke test"
```
