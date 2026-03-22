# Bidly — Design Spec

**Date:** 2026-03-22
**Context:** 6-hour hackathon ("Build Canada" theme), 4-person team, vibe-coding
**Stack:** Next.js, TypeScript, shadcn/ui, Tailwind CSS, Supabase (PostgreSQL + pgvector), Claude API (Anthropic), Voyage AI (embeddings)

---

## 1. Problem Statement

Canadian businesses — especially small and mid-sized ones — struggle to compete for government contracts. The procurement process is fragmented across multiple portals (CanadaBuys, BC Bid, MERX), RFP documents are dense with legal/procurement jargon, Buy Canadian compliance is confusing, and missing a single mandatory form means automatic disqualification.

Bidly is an AI-powered procurement assistant that guides businesses through the entire process: finding relevant tenders, understanding requirements, checking eligibility, and drafting competitive bids.

---

## 2. Features & Pain Points

| Pain Point | Feature | MVP Scope |
|---|---|---|
| P1: Finding the right tender | Business Profile Intake + Tender Matching Engine | User enters company info (NAICS codes, capabilities, location). System ranks tenders by vector similarity. |
| P3: RFP language is impenetrable | RFP Plain Language Summarizer | AI reads the solicitation and outputs: what they want, deadlines, mandatory forms, evaluation criteria, disqualification risks — in plain English. |
| P2: Buy Canadian compliance | Buy Canadian Eligibility Checker | Guided questionnaire: location, tax filing, content %. Clear pass/fail output with explanation and documentation checklist. |
| P4: Forms overload | Forms Checklist & Tracker | Auto-generates required forms list per tender with status tracking (not started / in progress / done). Visual progress bar. |
| P4+P3: Forms + jargon | Form-by-Form Guidance | AI explains each form in plain language: what it asks, common mistakes, what to write. |
| P1+P3: Drafting the bid | Bid Draft Assistant | AI drafts sections of the technical/financial proposal using RFP summary + company profile. User edits from there. |
| P5: Financial & tax complexity | Pricing Schedule Helper | User enters unit prices, system structures pricing schedule with correct GST/HST and payment formatting. |

---

## 3. Architecture

### Approach: Single-Agent with Tool-Use (Refactorable to Multi-Agent)

For the hackathon, a **single Claude session with tool-use** handles all AI operations. Claude's native tool-use acts as the implicit orchestrator — it decides which tools to call based on user intent. This delivers the same user experience as a multi-agent system with dramatically less plumbing.

The 5 agents are UI presentation layers over one Claude session. Each "agent" is a prompt mode that:

1. Sets a system prompt segment specific to that agent's role
2. Exposes only the relevant tool subset
3. Uses the agent's color in the UI

**Why this works:**
- Same demo story — user still gets guided through profile → find → understand → check → draft
- One Claude integration instead of wiring up 5 agents + a router
- Tool-use IS the orchestration
- Clean refactoring path to multi-agent (tools stay the same, agent boundaries are additive)

### Agent → Tool Mapping

| Agent | Tools Available |
|-------|----------------|
| Profile | `getCompanyProfile`, `saveProgress` (type: profile) |
| Scout | `searchTenders`, `getCompanyProfile` |
| Analyst | `getTenderDetails`, `summarizeTender`, `getFormChecklist` |
| Compliance | `checkEligibility`, `getCompanyProfile` |
| Writer | `draftBidSection`, `explainForm`, `calculatePricing`, `saveProgress` |

### Refactoring Path to Multi-Agent

The tools are the stable contract. To refactor:

1. Extract each tool group into its own agent with a dedicated system prompt
2. Add an orchestrator API + intent router on top
3. Each agent gets its own API route
4. **UI stays identical** — only backend changes

---

## 4. Agent Roster & Sequential Flow

### 5 Agents

| Agent | Color | Category | Role |
|-------|-------|----------|------|
| **Profile** | Orange (#e67e22) | Setup | Conversational company profile builder. Mandatory first step. |
| **Scout** | Blue (#3b82f6) | Research | Finds and ranks matching tenders via vector similarity. |
| **Analyst** | Cyan (#06b6d4) | Research | Analyzes selected RFP: plain-language summary, deadlines, forms, evaluation, risks. |
| **Compliance** | Green (#10b981) | Execute | Buy Canadian eligibility check, certifications, mandatory steps, documentation checklist. |
| **Writer** | Purple (#8b5cf6) | Execute | AI-drafts bid sections, form guidance, pricing schedule with GST/HST. |

### Sequential Flow

```
Profile (mandatory) → Scout → Analyst → Compliance → Writer
```

- **Profile** must be completed before any other agent is accessible
- Each subsequent agent unlocks when the prior step has meaningful output
- Users can navigate back to completed agents to review/edit
- Sidebar shows state: completed (green checkmark), active (colored left border + blinking cursor), locked (greyed out)

---

## 5. Profile Agent

### Purpose

Forces users to establish their company profile before accessing any procurement features. This data feeds all downstream agents (Scout matching, Compliance checking, Writer drafting).

### Conversation Flow

The Profile Agent asks questions one at a time:

1. "What's your company name?"
2. "What province are you based in?" (multiple choice: ON, BC, AB, QC, Other)
3. "What services does [company] provide?" (free text → auto-maps to NAICS codes + keywords)
4. "What's your typical project size range?" + "Do you have certifications like WSIB or bonding?"
5. "What's your insurance coverage level?" + "Any specific sectors you target?"
6. Review: "Here's your profile — does everything look right?"

### Auto-Detection

When the user describes their services, the agent:
- Maps to NAICS codes (e.g., "plumbing" → 238220)
- Extracts keywords for tender matching
- Generates an embedding via Voyage AI for vector similarity search

### Completion Gate

Profile is "complete" when minimum fields are filled:
- Company name (required)
- Province (required)
- Capabilities text (required)
- At least one auto-detected NAICS code

Once complete, Scout unlocks in the sidebar.

---

## 6. UI Layout

### Agentic UI Style: Light Sidebar + Dashboard Main

Two primary zones:

```
┌──────────────┬──────────────────────────────────────────────────┐
│              │  Header (breadcrumb + user badge)                │
│   SIDEBAR    ├──────────────────────────────────────────────────┤
│   220px      │                                                  │
│              │  Main Content Area                               │
│   Light bg   │  (dashboard cards, lists, editors)               │
│   (#fbfaf9)  │                                                  │
│              │  Agent-specific view fills this space             │
│              │                                                  │
│              ├──────────────────────────────────────────────────┤
│              │  Chat Input Bar (sticky bottom)                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Sidebar Anatomy

```
┌─────────────────┐
│ [logo] Bidly    │  Brand mark + wordmark
│                 │
│ ⚙ SETUP         │  Category header (mono, 10px, tracked)
│   ✓ Profile     │  Completed state (green)
│                 │
│ ◆ RESEARCH      │  Category header
│   ✓ Scout       │  Completed
│   ● Analyst █   │  Active (colored border + cursor)
│                 │
│ ◼ EXECUTE       │  Category header
│   ● Compliance  │  Locked (greyed)
│   ● Writer      │  Locked (greyed)
│                 │
│ ─────────────── │
│ Amato Plumbing  │  Company name (from profile)
│ Ontario • 238220│  Province + NAICS
│                 │
│ Bidly v1.0      │  Branding footer
│ © 2026          │
└─────────────────┘
```

- **No dark sidebar** — light background (#fbfaf9) with 1px right border
- Category headers: mono, 10px, 2px letter-spacing, uppercase, muted color
- Active item: white background, 3px left border in agent color, bold text, blinking cursor block
- Completed: green checkmark, green text
- Locked: hint-color text, dot at 25% opacity, non-clickable
- Footer shows company info once Profile is completed (shows "No profile yet" in italic before)

### Main Header Bar

```
┌──────────────────────────────────────────────────────────────┐
│ ANALYST • RFP Analysis                        Demo Mode  [A]│
└──────────────────────────────────────────────────────────────┘
```

- Breadcrumb: agent name + context (mono, uppercase, tracked)
- Right: user badge or "Demo Mode" indicator

### Navigation Rules

1. **Sidebar** — click any unlocked agent to switch views
2. **Action buttons** — "Begin Compliance →" in Analyst view switches to Compliance agent
3. **Chat suggestions** — agent may suggest moving to next step
4. **Back navigation** — completed agents are always accessible for review/editing
5. **Locked agents** — greyed out, non-clickable, show agent-colored dot at 25% opacity

---

## 7. Agent Views

### 7.1 Profile Agent — Chat + Card Builder

**Layout:** Split view — chat column (420px) on left, profile cards panel on right.

**Chat Column:**
- Header: "Let's set up your profile" (serif, 22px) + subtitle
- Agent asks questions one at a time conversationally
- Suggested answers as clickable option chips (mono, bordered)
- User responses shown as right-aligned bubbles

**Profile Cards Panel:**
- Progress bar with completion count ("4 of 7 fields completed")
- Cards appear and animate in as the user answers questions
- Completed cards: solid border, filled content
- In-progress card: dashed orange border, "Waiting for your response..."
- Empty cards: dashed grey border, label only
- Fields: Company Name, Location, Industry Classification (auto-detected NAICS), Capabilities, Project Size & Certifications, Keywords, Bonding & Insurance
- **DB mapping note:** Company Name, Location, Capabilities, Keywords map directly to `business_profiles` columns. Industry Classification maps to `naics_codes`. Project Size, Certifications, and Bonding & Insurance are stored in `capabilities` text field (free-form) — no schema changes needed.

**Profile Agent triggers auto-detection:** when user describes services, the agent maps to NAICS codes and keywords automatically.

### 7.2 Scout Agent — Tender Dashboard

**Layout:** Full-width dashboard with stats + tender list.

**Components:**
- Title row: "Matching Tenders" (serif, 28px) + subtitle showing profile keywords
- Filter bar: connected button group (All Matches / High Match / Closing Soon / Ontario / Federal)
- Stats row: 4 cards in 1px-gap grid (Total Matches, High Match >80%, Closing This Week, Avg Match Score)
- Tender list: stacked cards separated by 1px gaps, each containing:
  - Match percentage (large mono number, green for >80%, orange for 60-80%)
  - Tender title (15px, 500 weight)
  - Metadata line: reference number, closing date (red if soon), estimated value
  - Tags: category badges (match highlight / level of government)
  - "Analyze →" action button

**Chat bar:** "Ask Scout to refine results — 'show me federal contracts only' or 'anything closing this month?'"

### 7.3 Analyst Agent — RFP Analysis Dashboard

**Layout:** Full-width card grid + risks section.

**Components:**
- Title row: tender name (serif, 28px) + tender ID + match score
- Action buttons: "View Original ↗", "Download RFP ↗", "Begin Compliance →" (primary)
- 2×2 card grid (1px-gap, no borders):
  - **What They Want** — plain-language scope summary
  - **Key Deadlines** — closing date (red, bold), site visit, questions deadline
  - **Mandatory Forms** — checklist with REQUIRED badges
  - **Evaluation Criteria** — horizontal bar chart (Technical 70%, Price 30%) + minimum score threshold
- Wide card: **Disqualification Risks** — warning items with ⚠ icons, red highlights for critical issues, ✓ for passing items

**Chat bar:** "Ask about this RFP — requirements, risks, evaluation details..."

### 7.4 Compliance Agent — Eligibility Assessment

**Layout:** Full-width with result banner + grouped checklists.

**Components:**
- Title row: "Eligibility Assessment" (serif, 28px) + tender reference
- Action buttons: "Export Checklist", "Begin Bid Draft →" (primary)
- Result banner: 3 cards (Overall Eligibility with pass/warn/fail coloring, Requirements Met count, Action Required count)
- Grouped checklists (collapsible sections):
  - **Buy Canadian Policy** — Canadian registration, trade agreement compliance
  - **Qualifications & Certifications** — WSIB, insurance (with fail state + help link), experience
  - **Mandatory Participation** — site visit registration (warn state), bid bond
  - **Required Documentation** — health & safety policy, subcontractor declaration (pending dots)
- Each item: status icon (pass/fail/warn/pending circle), name, description, action link, status badge

**Chat bar:** "Ask about requirements — 'what insurance do I need?' or 'explain Buy Canadian policy'"

### 7.5 Writer Agent — Bid Workspace

**Layout:** Split view — section tabs (200px) on left, editor area on right.

**Section Tabs:**
- Grouped: Bid Sections (Executive Summary, Technical Approach, Team & Experience, Project Management, Safety Plan) + Forms & Pricing (Pricing Schedule, Form Guidance) + Export (Preview Full Bid)
- Status indicators: ✓ done (green), ● draft (purple), ○ empty (grey)
- Active tab: left purple border, bold text, grey background

**Editor Area:**
- Toolbar: section title (serif, 20px) + actions (Regenerate in purple outline, Copy, Save Draft primary)
- Content blocks with labels: "Opening Statement [AI DRAFT]", "Company Qualifications [AI DRAFT]"
- Editable areas: `contenteditable` divs with subtle border, hover/focus states
- AI suggestions: left-bordered purple callout boxes with improvement tips
- Pricing table: full-width table with line items, subtotal, HST calculation, total

**Chat bar:** "'Make this more concise', 'add our traffic management experience', 'regenerate pricing'..."

---

## 8. Design System

### Color System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | #f8f7f5 | Page background |
| `--white` | #ffffff | Cards, active sidebar items |
| `--sidebar-bg` | #fbfaf9 | Sidebar background (light, not dark) |
| `--border` | #e8e5e0 | Primary borders |
| `--border-light` | #f0ede8 | Secondary/internal borders |
| `--text-primary` | #1a1a1a | Headings, body text |
| `--text-secondary` | #6b6560 | Secondary text, sidebar items |
| `--text-muted` | #a09a94 | Labels, metadata |
| `--text-hint` | #c4bfb8 | Placeholders, locked items |
| `--accent-red` | #c41e3a | Urgent deadlines, fail states |
| `--agent-profile` | #e67e22 | Profile agent accent |
| `--agent-scout` | #3b82f6 | Scout agent accent |
| `--agent-analyst` | #06b6d4 | Analyst agent accent |
| `--agent-compliance` | #10b981 | Compliance agent accent |
| `--agent-writer` | #8b5cf6 | Writer agent accent |
| `--success` | #1a7a4c | Completed states, pass results |

### Typography

- **Labels/metadata:** IBM Plex Mono — uppercase, letter-spacing 1-2px, 9-11px
- **Body:** IBM Plex Sans — 13-14px, weight 400-500
- **Titles:** DM Serif Display — 20-28px

### Layout Patterns

- **No shadows anywhere** — all structure via 1px borders
- **1px gap grids** — cards separated by border-colored gaps (background shows through)
- **No rounded corners** — sharp edges throughout (except sidebar logo: 6px radius)
- **Connected button groups** for filters — no gaps, shared borders
- **Sticky chat input** at bottom of main content with gradient fade
- **Agent-colored accents** — left borders on active sidebar items, chat input labels, status indicators

### Mockups (v4 — Agentic UI)

Reference mockups in `.superpowers/brainstorm/10729-1774195258/`:
- `agent-profile.html` — Profile Agent: chat + card builder
- `agent-scout.html` — Scout Agent: tender dashboard
- `agentic-light-sidebar-v2.html` — Analyst Agent: RFP analysis cards
- `agent-compliance.html` — Compliance Agent: eligibility checklist
- `agent-writer.html` — Writer Agent: bid workspace editor

---

## 9. Data Model (Supabase)

### Tables

**`business_profiles`**
- `id` (uuid, PK)
- `company_name` (text)
- `naics_codes` (text[])
- `location` (text)
- `province` (text)
- `capabilities` (text)
- `keywords` (text[])
- `embedding` (vector(512)) — Voyage AI `voyage-3-lite` outputs 512 dimensions
- `created_at` (timestamptz)

**`tenders`**
- `id` (uuid, PK)
- `reference_number` (text, unique) — from CSV `referenceNumber-numeroReference`
- `solicitation_number` (text) — from CSV `solicitationNumber-numeroSollicitation`
- `title` (text) — from CSV `title-titre-eng`
- `description` (text) — from CSV `tenderDescription-descriptionAppelOffres-eng`
- `publication_date` (timestamptz) — from CSV `publicationDate-datePublication`
- `closing_date` (timestamptz) — from CSV `tenderClosingDate-appelOffresDateCloture`
- `status` (text) — from CSV `tenderStatus-appelOffresStatut-eng`
- `procurement_category` (text) — from CSV `procurementCategory-categorieApprovisionnement` (values: CNST/GD/SRV/SRVTGD)
- `notice_type` (text) — from CSV `noticeType-avisType-eng` (values: RFP, RFI, etc.)
- `procurement_method` (text) — from CSV `procurementMethod-methodeApprovisionnement-eng`
- `selection_criteria` (text) — from CSV `selectionCriteria-criteresSelection-eng`
- `gsin_codes` (text[]) — from CSV `gsin-nibs`
- `unspsc_codes` (text[]) — from CSV `unspsc`
- `regions_of_opportunity` (text[]) — from CSV `regionsOfOpportunity`
- `regions_of_delivery` (text[]) — from CSV `regionsOfDelivery`
- `trade_agreements` (text[]) — from CSV `tradeAgreements`
- `contracting_entity` (text) — from CSV `contractingEntityName`
- `notice_url` (text) — from CSV `noticeURL-URLavis-eng`
- `attachment_urls` (text[]) — from CSV `attachment-piecesJointes-eng`
- `raw_csv_data` (jsonb) — full row for reference
- `created_at` (timestamptz)

**`tender_embeddings`**
- `id` (uuid, PK)
- `tender_id` (uuid, FK → tenders)
- `embedding` (vector(512)) — Voyage AI `voyage-3-lite` outputs 512 dimensions
- `chunk_text` (text)

**`eligibility_checks`**
- `id` (uuid, PK)
- `profile_id` (uuid, FK → business_profiles)
- `tender_id` (uuid, FK → tenders)
- `responses` (jsonb) — questionnaire answers
- `result` (text) — pass/fail
- `explanation` (text)
- `documentation_checklist` (jsonb)
- `created_at` (timestamptz)

**`bid_drafts`**
- `id` (uuid, PK)
- `profile_id` (uuid, FK → business_profiles)
- `tender_id` (uuid, FK → tenders)
- `sections` (jsonb) — {exec_summary, technical, team, project_mgmt, safety, pricing}
- `status` (text) — draft/complete
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**`form_checklists`**
- `id` (uuid, PK)
- `profile_id` (uuid, FK → business_profiles)
- `tender_id` (uuid, FK → tenders)
- `forms` (jsonb) — [{name, status, guidance, download_url}]
- `progress_pct` (integer)
- `created_at` (timestamptz)

### pgvector Setup
- Enable `vector` extension in Supabase
- Voyage AI `voyage-3-lite` outputs **512-dimensional** vectors — all `vector` columns must be `vector(512)`
- Embed tender descriptions using Voyage AI `voyage-3-lite`
- Embed business profiles on save
- Matching = cosine similarity between profile embedding and tender embeddings

### Core TypeScript Types

```typescript
interface BusinessProfile {
  id: string;
  company_name: string;
  naics_codes: string[];
  location: string;
  province: string;
  capabilities: string;
  keywords: string[];
  created_at: string;
}

interface Tender {
  id: string;
  reference_number: string;
  solicitation_number: string;
  title: string;
  description: string;
  publication_date: string;
  closing_date: string;
  status: string;
  procurement_category: "CNST" | "GD" | "SRV" | "SRVTGD";
  notice_type: string;
  gsin_codes: string[];
  unspsc_codes: string[];
  regions_of_opportunity: string[];
  regions_of_delivery: string[];
  trade_agreements: string[];
  contracting_entity: string;
  notice_url: string;
  attachment_urls: string[];
  match_score?: number; // added by search, not in DB
}

interface EligibilityCheck {
  id: string;
  profile_id: string;
  tender_id: string;
  responses: Record<string, string>;
  result: "pass" | "fail";
  explanation: string;
  documentation_checklist: { item: string; required: boolean }[];
}

interface BidDraft {
  id: string;
  profile_id: string;
  tender_id: string;
  sections: {
    exec_summary?: string;
    technical?: string;
    team?: string;
    project_mgmt?: string;
    safety?: string;
    pricing?: string;
  };
  status: "draft" | "complete";
}

interface FormChecklistItem {
  name: string;
  status: "not_started" | "in_progress" | "done";
  guidance?: string;
  download_url?: string;
}

interface FormChecklist {
  id: string;
  profile_id: string;
  tender_id: string;
  forms: FormChecklistItem[];
  progress_pct: number;
}
```

### Data Seeding
- Source: `https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv`
- Licensed under Open Government Licence — Canada (free to use)
- Parse CSV, filter to open/active tenders, insert into `tenders` table
- Run Voyage embedding pipeline over `description` field, store in `tender_embeddings`
- For hackathon: pre-load 200-500 tenders from the FY 2025-2026 file

---

## 10. AI & Tools (Claude Integration)

### System Prompt Structure
```
You are Bidly, a procurement assistant for Canadian businesses.
You have access to the user's company profile: {profile}
You help them find, understand, and bid on government tenders.
When summarizing, always structure output as:
- What they want
- Key deadlines
- Mandatory forms
- Evaluation criteria
- Disqualification risks
```

### Tools

| Tool | Input | Output | Used For |
|------|-------|--------|----------|
| `searchTenders` | query text (optional), filters (category, region, status) | Ranked list of matching tenders. If query provided: embed via Voyage → pgvector cosine similarity. If query empty: SQL filter only, ordered by closing_date. | Tender Dashboard |
| `getTenderDetails` | tender_id | Full tender record from DB | Tender Detail |
| `summarizeTender` | tender_id | Plain-language breakdown | RFP Summarizer |
| `checkEligibility` | profile_id, tender_id, questionnaire_responses | Pass/fail + explanation + docs checklist | Buy Canadian Checker |
| `getFormChecklist` | tender_id | Required forms extracted from description | Forms Checklist |
| `explainForm` | form_name, tender_context | Plain-language explanation, common mistakes | Form Guidance |
| `draftBidSection` | section_type (exec_summary/technical/team/project_mgmt/safety), tender_id, profile_id | AI-drafted section text. Frontend patches the corresponding key in `bid_drafts.sections` JSONB client-side, then calls `saveProgress` to persist. Regeneration = call again with same section_type, replace the key. | Bid Draft |
| `calculatePricing` | line_items[], province | Structured pricing with GST/HST | Pricing Helper |
| `getCompanyProfile` | profile_id | Business profile from DB | Context for AI |
| `saveProgress` | type: `"eligibility"` / `"draft"` / `"forms"` / `"profile"`, data: row payload matching the target table | Upserts by `(profile_id, tender_id)`. Maps to: `eligibility_checks` (eligibility), `bid_drafts` (draft), `form_checklists` (forms), `business_profiles` (profile). | Save state |

### Integration Pattern
- **Structured operations** (search, save, load) → normal Next.js API routes → Supabase
- **AI operations** (summarize, draft, explain, check) → `/api/ai` route → Claude with tool definitions
- Frontend sends user intent + context, Claude picks tools, returns structured output for rendering

### Error Handling Conventions
- All AI operations show a loading skeleton while in progress
- Claude API timeouts (>30s): show "AI is taking longer than expected" with a retry button
- Voyage API failures during seeding: log and skip the row, continue with remaining tenders
- CSV malformed rows: skip with warning, don't halt the seeding script
- pgvector returning no results: show "No matching tenders found. Try broadening your search criteria."
- All errors surfaced to the user with a clear message and retry option — no silent failures

### Embedding Strategy
- **Model:** Voyage AI `voyage-3-lite` (Anthropic-recommended, free tier)
- **Embed on seed:** tender descriptions → `tender_embeddings`
- **Embed on save:** business profile → `business_profiles.embedding`
- **Search:** cosine similarity via pgvector

---

## 11. Team Split & 6-Hour Timeline

Split by layer — each person owns a clear domain with minimal overlap.

### Person 1: Data & Infrastructure
*Sets up the foundation everyone else builds on — starts first*

| Hour | Task |
|------|------|
| 0-1 | Supabase project setup, schema creation (all tables), enable pgvector |
| 1-2 | CSV parser script — parse CanadaBuys CSV, filter to open tenders, insert into `tenders` |
| 2-3 | Embedding pipeline — call Voyage API on tender descriptions, store in `tender_embeddings` |
| 3-4 | Seed script for demo data — create sample business profile, verify search returns good matches |
| 4-6 | Support other team members, fix data issues, help with Supabase client setup |

### Person 2: Frontend & UI
*Builds all pages and components with shadcn*

| Hour | Task |
|------|------|
| 0-1 | `npx create-next-app`, install shadcn + Tailwind, set up layout (sidebar nav, page structure) |
| 1-2 | Profile Agent view — chat + card builder split layout |
| 2-3.5 | Scout Agent — tender dashboard with stats + card list |
| 3.5-5 | Analyst + Compliance views |
| 5-6 | Writer Agent — bid workspace, polish, loading states |

### Person 3: AI & Tools
*All Claude + Voyage integration*

| Hour | Task |
|------|------|
| 0-1 | Set up Anthropic SDK, create `/api/ai` route, define tool schemas for Claude |
| 1-2.5 | Implement `searchTenders` (Voyage embed query → pgvector similarity) + `getTenderDetails` |
| 2.5-4 | Implement `summarizeTender`, `checkEligibility`, `getFormChecklist`, `explainForm` |
| 4-5.5 | Implement `draftBidSection`, `calculatePricing` |
| 5.5-6 | Test end-to-end flow, prompt tuning |

### Person 4: API Routes & Integration
*Glues frontend to data and AI — connects everything*

| Hour | Task |
|------|------|
| 0-1 | Supabase client config in Next.js, environment variables, type definitions |
| 1-2 | API routes: `/api/profile` (CRUD), `/api/tenders` (list/search/detail) |
| 2-3.5 | API routes: `/api/eligibility`, `/api/drafts`, `/api/forms` |
| 3.5-5 | Wire frontend pages to API routes — connect Person 2's UI to real data |
| 5-5.5 | Build Eligibility Check page (simpler questionnaire UI — Person 4 takes this off Person 2's plate) |
| 5.5-6 | End-to-end testing, fix integration bugs, help prep demo |

### Critical Path
Person 1 must have DB + seed data ready by hour 2-3 so Persons 3 and 4 can work against real data. Person 2 can work independently from hour 0.

### First 15 Minutes — Agree On:
- API route signatures (what each endpoint accepts/returns)
- Supabase table names and column names
- Shared TypeScript types for Tender, Profile, Draft, etc.

### Team & Environment
- **4 people, 6-hour hackathon**
- **3 on macOS, 1 on Windows** (team lead)
- **Skill level:** Data scientists, novices in full-stack development

---

## 12. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent architecture | Single Claude session with tool-use | Dramatically simpler for 6-hour hackathon. Same UX. Refactorable to multi-agent. |
| LLM | Claude (Anthropic) | Native tool-use, strong at structured output and long-context RFP analysis |
| Embeddings | Voyage AI `voyage-3-lite` | Anthropic-recommended, free tier, good quality |
| Data source | CanadaBuys CSV (pre-loaded) | Public, no auth, Open Government Licence. Avoids scraping risk. |
| Vector search | pgvector (Supabase) | No additional infra. Cosine similarity for matching. |
| Frontend | Next.js + shadcn/ui + Tailwind | Rapid development, good component library, team can vibe-code |
| Database | Supabase (PostgreSQL) | Auth, DB, storage, realtime — all-in-one. Free tier. |

---

## 13. Out of Scope (Hackathon)

- Live scraping of CanadaBuys / BC Bid
- User authentication (can be added post-hackathon via Supabase Auth)
- Multi-user / team collaboration
- PDF upload and parsing of full RFP documents
- SAP Ariba integration for protected documents
- Hosting / deployment
- BC Bid and MERX data sources (CanadaBuys only for MVP)
