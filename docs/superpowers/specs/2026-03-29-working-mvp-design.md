# Working MVP Design Spec

> Move Bidly from a hardcoded demo to a fully functional MVP with real data pipelines, agentic tool calls, and Supabase as the single source of truth.

**Date:** 2026-03-29
**Status:** Approved

---

## 1. Architecture

### Approach: Supabase as Single Source of Truth (Structured RAG)

Every agent retrieves upstream context from Supabase before generating, and writes its output back after completing. React state serves as a UI cache only — not the source of truth for inter-agent data.

Each agent's API call builds context server-side via a shared function:

```
buildAgentContext(agentId, profileId, tenderId?)
```

This replaces the current client-side `profileContext` string approach.

### Context Flow

```
Profile Agent  → writes: business_profiles
Scout Agent    → reads: business_profiles
               → writes: tender_selections
Analyst Agent  → reads: business_profiles, tenders, tender_selections
               → writes: tender_analyses
Compliance     → reads: business_profiles, tenders, tender_analyses
               → writes: eligibility_checks, updates business_profiles
Writer Agent   → reads: business_profiles, tenders, tender_analyses, eligibility_checks
               → writes: bid_drafts
```

### Client-Side State

`useAgent` hook retains:
- `activeAgent`, `statuses`, `setActiveAgent`, `completeAgent` — UI flow control
- `profile`, `setProfile` — UI cache of Supabase profile
- `selectedTender`, `setSelectedTender` — UI cache of selected tender
- **New:** `profileId: number | null` — Supabase row reference, passed to all API calls
- **New:** `tenderId: number | null` — derived from `selectedTender.id`

### Page Load Hydration

On app mount:
1. `GET /api/profile` → if profile exists, hydrate `profile` + `profileId`, mark Profile as `completed`
2. Check `tender_selections` for this profile → if exists, hydrate `selectedTender`, unlock downstream agents
3. Each view checks Supabase for existing data and renders it

Refresh does not lose progress.

### `/api/ai` Route Change

**Before:** `{ agentId, messages, profileContext (string) }`
**After:** `{ agentId, messages, profileId, tenderId? }`

Server calls `buildAgentContext()` internally. No more client-side context string building.

---

## 2. Data Model

### Modified Table: `business_profiles`

Add explicit columns:

| Column | Type | Purpose |
|--------|------|---------|
| `insurance_amount` | `text` | e.g., "$2M commercial liability" |
| `bonding_limit` | `text` | e.g., "$500K" |
| `certifications` | `text[]` | e.g., `["WSIB", "ISO 9001"]` |
| `years_in_business` | `integer` | |
| `past_gov_experience` | `text` | Free text description |
| `pbn` | `text` | Procurement Business Number |
| `is_canadian` | `boolean` | Buy Canadian hard gate |
| `security_clearance` | `text` | e.g., "Reliability", "Secret", "None" |
| `project_size_min` | `integer` | Minimum project size in dollars |
| `project_size_max` | `integer` | Maximum project size in dollars |

Remove:
- `embedding` column (Voyage removed)

### New Table: `tender_selections`

```sql
create table tender_selections (
  id bigint generated always as identity primary key,
  profile_id bigint not null references business_profiles(id) on delete cascade,
  tender_id bigint not null references tenders(id) on delete cascade,
  match_score integer not null default 0,
  matched_keywords text[] not null default '{}',
  match_reasoning text not null default '',
  created_at timestamptz not null default now(),
  unique (profile_id, tender_id)
);

create index tender_selections_profile_id_idx on tender_selections (profile_id);
create index tender_selections_tender_id_idx on tender_selections (tender_id);
```

### New Table: `tender_analyses`

```sql
create table tender_analyses (
  id bigint generated always as identity primary key,
  profile_id bigint not null references business_profiles(id) on delete cascade,
  tender_id bigint not null references tenders(id) on delete cascade,
  analysis jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (profile_id, tender_id)
);

create index tender_analyses_profile_id_idx on tender_analyses (profile_id);
create index tender_analyses_tender_id_idx on tender_analyses (tender_id);
```

The `analysis` JSONB column stores the structured output:

```typescript
interface TenderAnalysis {
  whatTheyWant: string[];
  deadlines: { label: string; value: string; urgent: boolean }[];
  forms: string[];
  evaluation: { criteria: string; weight: string }[];
  risks: { level: "high" | "medium" | "low"; text: string }[];
}
```

### Dropped

- `tender_embeddings` table
- `match_tenders` RPC function
- `embedding` column from `business_profiles`

### Unchanged

- `tenders`
- `eligibility_checks`
- `bid_drafts`
- `form_checklists`

---

## 3. Agent Designs

Every agent has a **chat interface** (right panel) alongside its **primary UI** (left/main area). The chat is never hidden — it is how the user interacts with each agent. The primary UI shows the output of that interaction.

| Agent | Primary UI | Chat Panel |
|-------|-----------|------------|
| Profile | Read-only profile summary (after completion) | Guided interview chat |
| Scout | Tender results list with match scores | Refine search, ask about matches |
| Analyst | Structured analysis cards | Follow-up questions about the tender |
| Compliance | Assessment results (pass/warn/fail) | Guided interview + post-assessment questions |
| Writer | Section list with status + draft preview | Guided drafting + revision requests |

### 3.1 Profile Agent

**Flow:** Guided interview, one question at a time.

1. Company name
2. Province (suggest: Ontario, BC, Alberta, Quebec, Saskatchewan, Other)
3. Services/capabilities (free text) → AI infers NAICS codes, presents for confirmation: "Based on your services, your NAICS codes would be **561720 — Janitorial Services**. Does that sound right?"
4. Years in business + typical project size range (min/max in dollars)
5. Certifications & insurance (WSIB, bonding amount, liability insurance amount)
6. Past government contract experience
7. Summary of everything + final confirmation

**On confirm:** Save to `business_profiles` with all explicit columns.

**Returning user:** Show read-only profile summary with "Edit" button that re-opens chat to update specific fields.

**Completion:** `completeAgent("profile")` → unlocks Scout.

### 3.2 Scout Agent

**On load:** Auto-calls `matchTendersToProfile` — SQL filter by province (`regions_of_delivery`), category, keyword `ILIKE` against title + description. Returns candidate tenders.

**AI ranks candidates:** LLM reads profile + filtered tenders, ranks them, and explains fit for each. No embeddings — the LLM does the semantic reasoning.

**User interaction:** Can refine via conversation using `searchTenders` (full-text search) and `filterTenders` (closing date, category, entity).

**Selection:** User picks a tender → saves to `tender_selections` (match_score, matched_keywords, match_reasoning) → `setSelectedTender` in React state → unlocks Analyst.

### 3.3 Analyst Agent

**On load with selected tender:** Auto-calls `/api/analyze-tender` with profile + tender + match context from Scout.

**Profile-aware analysis:** All output framed against the company's profile:
- "What They Want" → with alignment notes ("your capabilities match X")
- "Risks" → profile-relative ("requires $1M bonding — your profile shows $500K")
- "Evaluation Criteria" → strength/gap assessment

**Structured output saved to `tender_analyses`.**

**Chat:** User can ask "what do you think about this contract based on my profile?" and get a real, context-aware answer.

**Handoff:** "Begin Compliance →" button.

### 3.4 Compliance Agent

**Buy Canadian is a hard gate.** If the company fails Buy Canadian, the assessment stops immediately with "Not Eligible". No further interview.

**Standard Federal Procurement Compliance Checklist** (applies to all Government of Canada tenders):

1. **Buy Canadian Policy** — Canadian ownership, Canadian content, trade agreement compliance
2. **Legal & Corporate Standing** — registration, PBN, debarment/integrity regime
3. **Insurance & Bonding** — commercial liability, professional liability, bonding capacity, workers' comp
4. **Security & Clearances** — personnel clearances, facility clearance, Controlled Goods
5. **Certifications & Standards** — ISO, industry licenses, environmental, accessibility
6. **Administrative Requirements** — closing date, site visits, forms, subcontractor declarations

**Guided interview with reconfirmation:** Even if data was collected in Profile, Compliance re-asks in the context of the specific tender (e.g., "Your profile shows $1M liability — this tender requires $2M. Can you increase your coverage?").

**Interview order:** Canadian ownership → PBN → insurance → bonding → security clearances → certifications → subcontractors → confirm.

**On confirm:** Auto-calls `runComplianceAssessment` → calls `/api/check-compliance` with profile + tender + conversation → structured pass/warn/fail per section.

**Profile enrichment:** New company facts discovered during interview → `updateProfile` back to `business_profiles`.

**Saves to `eligibility_checks`.** Unlocks Writer.

### 3.5 Writer Agent

**Guided section-by-section via conversation.** AI walks user through each section:

1. AI introduces the section and what it should cover
2. AI calls `draftBidSection` → generates draft using full upstream context (profile + tender + analysis + compliance)
3. User reviews, gives feedback
4. AI refines based on feedback
5. User approves → `saveDraft` persists to `bid_drafts` → moves to next section

**Section order:**

1. Executive Summary
2. Technical Approach
3. Team & Experience
4. Project Management
5. Safety Plan (skippable — AI recommends, user decides)
6. Pricing (uses `calculatePricing` with provincial tax)
7. Forms Checklist (uses `getFormChecklist`)
8. Preview (full assembled document)

**Skipping:** AI assesses tender requirements and recommends skipping irrelevant sections. User always makes the final call.

---

## 4. Tool Definitions

### Existing Tools — Keep As-Is

| Tool | Handler | Purpose |
|------|---------|---------|
| `getTenderDetails` | Supabase query by ID | Fetch full tender data |
| `getCompanyProfile` | Supabase query by ID | Fetch profile data |
| `calculatePricing` | Provincial tax calculation | Line items + GST/HST |
| `saveProgress` | Generic upsert | Save to profile/eligibility/draft/forms |

### Existing Tools — Fix Implementation

| Tool | Current | Fix |
|------|---------|-----|
| `searchTenders` | Voyage vector search + SQL filter | Remove Voyage, use SQL full-text search + `ILIKE` keyword matching only |
| `checkEligibility` | Stub — returns a note | Rename to `runComplianceAssessment`, call `/api/check-compliance` with profile + tender + conversation |
| `draftBidSection` | Stub — returns a note | Generate real draft via AI using full upstream context |
| `explainForm` | Stub — returns a note | Generate real explanation using AI + tender context |

### New Tools

| Tool | Purpose |
|------|---------|
| `matchTendersToProfile` | SQL filter: province → `regions_of_delivery`, keywords → title/description `ILIKE`, category. Returns candidate tenders for LLM ranking. |
| `filterTenders` | Narrow results by closing date range, procurement category, contracting entity, status |
| `checkBuyCanadian` | Hard gate: company `is_canadian` + tender `trade_agreements` → pass/fail |
| `saveTenderSelection` | Persist to `tender_selections`: match_score, matched_keywords, match_reasoning |
| `saveAnalysis` | Persist structured analysis to `tender_analyses` |
| `saveComplianceResult` | Persist assessment to `eligibility_checks` |
| `saveDraft` | Persist individual section to `bid_drafts` |
| `updateProfile` | Partial update to `business_profiles` — available to all agents for newly discovered company facts |
| `getMatchContext` | Fetch `tender_selections` row for profile+tender (Analyst reads Scout's reasoning) |

### Removed Tools

| Tool | Reason |
|------|--------|
| `embedProfile` | Voyage removed |

### Tool Assignments Per Agent

| Tool | Profile | Scout | Analyst | Compliance | Writer |
|------|---------|-------|---------|------------|--------|
| `getCompanyProfile` | | x | x | x | x |
| `updateProfile` | x | x | x | x | x |
| `saveProgress` | x | | | | |
| `matchTendersToProfile` | | x | | | |
| `searchTenders` | | x | | | |
| `filterTenders` | | x | | | |
| `getTenderDetails` | | x | x | x | x |
| `saveTenderSelection` | | x | | | |
| `getMatchContext` | | | x | | |
| `summarizeTender` | | | x | | |
| `getFormChecklist` | | | x | | x |
| `saveAnalysis` | | | x | | |
| `checkBuyCanadian` | | | | x | |
| `runComplianceAssessment` | | | | x | |
| `saveComplianceResult` | | | | x | |
| `draftBidSection` | | | | | x |
| `saveDraft` | | | | | x |
| `calculatePricing` | | | | | x |
| `explainForm` | | | | | x |

---

## 5. Removals

### Demo Scaffolding to Delete

| File | What to Remove |
|------|---------------|
| `src/components/views/profile-view.tsx` | `DEMO_PAIRS`, `DEMO_PROFILE_PAYLOAD`, `demoMode` state, `demoStep` state, demo timing effects, "Load Demo" button |
| `src/components/views/compliance-view.tsx` | `DEMO_PAIRS`, `demoAssessment` hardcoded all-pass, `generateAssessment()` function |
| `src/components/views/writer-view.tsx` | `MOCK_CONTENT`, hardcoded `SECTIONS` statuses, `PDF_PRICING`, `PDF_MONTHLY_TOTAL`, `PDF_ANNUAL_TOTAL`, `PDF_GST`, `PDF_GRAND_TOTAL` |
| `src/components/views/scout-view.tsx` | `BOOST_KEYWORDS`, hardcoded scoring algorithm (99%/97%/88%/random), `limit=50` hardcode |
| `src/lib/ai/tool-handlers.ts` | Stub returns for `checkEligibility`, `draftBidSection`, `explainForm` |
| `src/components/chat-panel.tsx` | `buildContext()` client-side context string builder |

### Files to Delete Entirely

| File | Reason |
|------|--------|
| `src/lib/voyage.ts` | Voyage removed — no more embeddings |
| `scripts/embed-tenders.ts` | Embedding pipeline removed |

### Keep

- `scripts/seed-tenders.ts` — still needed to populate tenders from CSV
- `src/lib/seed-utils.ts` — still needed for seed utilities
- All API routes — they get wired up instead of bypassed

---

## 6. Auth-Ready Design

The architecture supports adding authentication later with minimal changes:

1. Add `user_id` column to `business_profiles`
2. Every agent query becomes `WHERE user_id = ?` instead of returning first profile
3. All downstream tables (`tender_selections`, `tender_analyses`, `eligibility_checks`, `bid_drafts`) are already keyed by `profile_id` — no changes needed
4. Add auth middleware (e.g., Clerk, NextAuth) to protect API routes

No state migration or data pipeline changes required.
