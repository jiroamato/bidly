# Scoring Overhaul: Multi-Signal BM25-Based Tender Matching

**Date:** 2026-03-31
**Status:** Approved

## Problem

The current scoring system produces uniformly low scores (~21% max, 4% average) for all tenders, even when tenders are clearly relevant to the company profile. This makes the matching feature unusable — users can't distinguish good matches from bad ones.

**Root causes:**
- Keyword matching uses long exact phrases that rarely appear verbatim in tender text
- Embedding similarity (Voyage AI) scores 20-50% for procurement text, capping the final score
- Regional pre-filtering excludes tenders from other provinces entirely
- The two-signal system (keyword 40% + embedding 60%) has a low ceiling

## Goals

- Closely related tenders should score **80-95%**
- Irrelevant tenders should score **0-15%** but still appear in results
- Scores should be **meaningful absolute percentages** (not just relative rankings)
- All tenders visible — no pre-filtering by region
- Purely algorithmic — no LLM or embedding API calls in the scoring pipeline
- Each signal interpretable — users can understand *why* a tender scored the way it did

## Architecture

### Scoring Signals

Four signals, each producing a 0-100 score, combined with weighted sum:

| Signal | Weight | Description |
|--------|--------|-------------|
| BM25 Text Relevance | 45% | Primary text matching using BM25 algorithm |
| Procurement Category Match | 25% | NAICS-to-category lookup against tender's `procurement_category` |
| Synonym Expansion Bonus | 15% | BM25 run with synonym terms only (no double-counting) |
| Location Signal | 15% | Province match or national scope = 100, else = 0 |

**Final score** = round(BM25 * 0.45 + category * 0.25 + synonym * 0.15 + location * 0.15)

**Missing signal redistribution:** If a signal cannot be computed (e.g., no NAICS codes on profile), its weight is redistributed proportionally to the remaining signals.

### Signal 1: BM25 Text Relevance (45%)

**BM25 formula:**

```
score(term, doc) = IDF(term) * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / avgDocLen))
```

Parameters:
- `k1 = 1.5` (term saturation)
- `b = 0.75` (length normalization)
- `IDF(term) = ln((N - df + 0.5) / (df + 0.5) + 1)`
- `N` = total tenders in corpus
- `df` = number of tenders containing the term
- `tf` = term frequency in this tender's text
- `docLen` = word count of this tender
- `avgDocLen` = average word count across all tenders

**Query terms:** All atomic keywords from the profile.

**Document text:** Tender `title` + `description` + `selection_criteria` concatenated.

**Normalization:** Raw BM25 scores are divided by the maximum score in the batch, then multiplied by 100. The best-matching tender = 100, everything else is relative.

### Signal 2: Procurement Category Match (25%)

A static lookup table maps NAICS code prefixes to expected procurement categories:

```
NAICS 54 (Professional/Scientific/Technical) -> ["Services", "Professional Services"]
NAICS 51 (Information/Cultural)              -> ["Services", "IT Services"]
NAICS 23 (Construction)                      -> ["Construction"]
NAICS 33 (Manufacturing)                     -> ["Goods"]
NAICS 56 (Administrative/Support)            -> ["Services"]
```

Scoring:
- Tender's `procurement_category` is in the expected set -> 100
- Partial overlap (e.g., profile expects "Services", tender says "Professional Services") -> 50
- No match -> 0
- No NAICS codes on profile -> signal weight redistributed

### Signal 3: Synonym Expansion Bonus (15%)

A second BM25 pass using only synonym terms from `keyword_synonyms` + a built-in procurement terminology map (e.g., "IT" <-> "information technology", "RFP" <-> "request for proposal").

Terms already present in the primary keyword query are excluded to prevent double-counting. Normalized the same way as Signal 1 (relative to max score in batch).

### Signal 4: Location Signal (15%)

All tenders are fetched from the database (no regional pre-filter). Location is scored as:

| Scenario | Score |
|----------|-------|
| Tender's `regions_of_delivery` includes profile's province | 100 |
| Tender's `regions_of_delivery` includes "Canada" (national) | 100 |
| Neither match | 0 |

Matching uses case-insensitive substring comparison (same logic as current `tenders_by_region` but as a scorer, not a filter).

## Keyword Extraction Changes

**Current:** AI extracts long phrases (e.g., "software maintenance and support"), limited to 15 phrases.

**New:** Extract atomic terms (1-2 words each):
- "software maintenance and support, IT systems management" -> `["software", "maintenance", "support", "IT", "systems", "management"]`
- The `extractKeywordsFromCapabilities()` fallback splits on delimiters, then splits each phrase into individual words
- Remove stop words (the, and, for, of, in, to, a, an, our, we, etc.)
- Deduplicate
- Limit raised to 50 atomic terms

The AI profile interview prompt is also updated to request atomic keywords instead of phrases.

## Data Flow

```
Profile (atomic keywords, synonyms, NAICS codes, province, capabilities)
  |
  v
Fetch ALL tenders from database (no region filter)
  |
  v
Build BM25 corpus index (computed once per scoring run)
  |
  v
For each tender:
  1. BM25 score with profile keywords -> normalize to 0-100
  2. NAICS-to-category lookup -> 0, 50, or 100
  3. BM25 score with synonym terms only -> normalize to 0-100
  4. Location match -> 0 or 100
  5. Weighted sum -> final match_score
  |
  v
Sort by match_score DESC -> return to UI
```

## What Gets Removed

| Component | Reason |
|-----------|--------|
| Voyage AI embedding generation (`embed.ts`) | Replaced by BM25 |
| `match_tenders_by_embedding()` RPC | No longer needed |
| `tender_embeddings` table usage | Not queried (table stays, just unused) |
| `tenders_by_region()` RPC | Replaced by fetch-all + location signal |
| `embedding-scorer.ts` | Replaced by BM25 scorer |
| `SCORING_WEIGHTS` (keyword: 0.4, embedding: 0.6) | Replaced by 4-signal weights |
| Current IDF logic in `keyword-scorer.ts` | Replaced by BM25 |

## What Stays (Rewritten)

| Component | Changes |
|-----------|---------|
| `keyword-scorer.ts` | Rewritten as BM25 scorer |
| `score-tenders.ts` | Rewritten with 4-signal combiner |
| `types.ts` scoring types | Updated with new signal weights and types |
| Profile creation endpoint | Updated keyword extraction (atomic terms) |
| Match API route | Simplified — no embedding fetch, no region RPC |
| All existing tests | Rewritten for new scoring logic |

## Expected Outcomes

For Northpoint Digital Solutions (IT/software services, Ontario):

| Tender Type | Expected Score |
|-------------|---------------|
| IT services tender in Ontario | 85-95% |
| IT services tender in Alberta | 70-80% |
| Construction tender in Ontario | 15-25% |
| Agriculture tender in Quebec | 0-5% |

## Files Affected

| File | Action |
|------|--------|
| `src/lib/matching/keyword-scorer.ts` | Rewrite as BM25 scorer |
| `src/lib/matching/score-tenders.ts` | Rewrite with 4-signal combiner |
| `src/lib/matching/embedding-scorer.ts` | Delete |
| `src/lib/matching/embed.ts` | Delete (or keep for future use) |
| `src/lib/matching/types.ts` | Update weights and types |
| `src/lib/matching/category-matcher.ts` | New — NAICS-to-category lookup |
| `src/lib/matching/location-scorer.ts` | New — location signal |
| `src/lib/matching/synonym-scorer.ts` | New — synonym BM25 pass |
| `src/app/api/tenders/match/route.ts` | Simplify — remove embedding/region RPCs |
| `src/app/api/profile/route.ts` | Update keyword extraction |
| `src/lib/ai/prompts.ts` | Update profile prompt for atomic keywords |
| `src/__tests__/lib/matching/*.test.ts` | Rewrite all matching tests |
