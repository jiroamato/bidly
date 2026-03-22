# Bidly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack agentic procurement assistant with 5 sequential agents (Profile → Scout → Analyst → Compliance → Writer) in an Agentic UI sidebar layout — demoable in 6 hours.

**Architecture:** Agentic UI 2-column layout (220px light sidebar + dashboard main) backed by Next.js API routes, Supabase/pgvector for data, and a single Claude session with tool-use that presents as 5 branded agents.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + pgvector), Anthropic Claude API, Voyage AI (embeddings), IBM Plex Mono/Sans + DM Serif Display

**Spec:** `docs/superpowers/specs/2026-03-22-bidly-design.md`

**Mockups:** `.superpowers/brainstorm/10729-1774195258/agent-*.html`

**Team:** 4 people (3 macOS, 1 Windows), data scientists, novice at full-stack. Tasks organized by person. Dependencies called out explicitly.

**Environment notes:**
- macOS: terminal commands work as-is
- Windows: use Git Bash (already configured). Forward slashes in paths. `npm`/`npx` work the same.
- All team members: Node.js 20+, npm, Git. VS Code recommended.

**Testing (MANDATORY):**
- **TDD is required for all tasks.** Write tests before implementation code. Use the `superpowers:test-driven-development` skill to guide the process.
- Test framework: Vitest (`npm test` to run, `npm run test:watch` for watch mode)
- Tests live in `tests/` directory, named `<module>.test.ts`
- Extract logic into importable utility modules (e.g., `src/lib/`) so tests can import them directly
- Every PR must include tests for new logic. No exceptions.

---

## Development Environment Setup (All 4 People, First 10 Minutes)

Before splitting into tracks, everyone does this together:

- [ ] **Step 1: Person 2 creates the Next.js project (others watch/clone after)**

```bash
npx create-next-app@latest bidly --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
cd bidly
```

When prompted: Use App Router = Yes, use `src/` directory = Yes.

- [ ] **Step 2: Person 2 pushes initial commit, everyone clones**

```bash
git add -A
git commit -m "chore: initialize Next.js 14 project"
git push origin dev
```

Other team members:
```bash
git clone <repo-url>
cd bidly
npm install
```

- [ ] **Step 3: Everyone creates `.env.local` from template**

Create `.env.local` in project root (this file is gitignored):

```env
# Supabase (Person 1 fills these after creating the project)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic (Person 3 fills this)
ANTHROPIC_API_KEY=sk-ant-your-key

# Voyage AI (Person 1 fills this)
VOYAGE_API_KEY=pa-your-key
```

- [ ] **Step 4: Person 2 installs shared dependencies**

```bash
# Supabase client
npm install @supabase/supabase-js

# Anthropic SDK
npm install @anthropic-ai/sdk

# shadcn/ui setup
npx shadcn@latest init -d

# Fonts (Google Fonts loaded via next/font, but we need the package)
npm install @fontsource/ibm-plex-mono @fontsource/ibm-plex-sans @fontsource-variable/dm-serif-display

# CSV parsing (for seeder script)
npm install -D csv-parse tsx
```

- [ ] **Step 5: Person 2 commits and pushes, everyone pulls**

```bash
git add -A
git commit -m "chore: add dependencies - supabase, anthropic, shadcn, fonts"
git push origin dev
```

Everyone else: `git pull origin dev && npm install`

---

## File Structure

```
bidly/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout — IBM Plex fonts, body
│   │   ├── page.tsx                      # Main app — sidebar + main content router
│   │   ├── globals.css                   # Tailwind + CSS custom properties (design tokens)
│   │   └── api/
│   │       ├── profile/route.ts          # Business profile CRUD
│   │       ├── tenders/
│   │       │   ├── route.ts              # List/search tenders
│   │       │   └── [id]/route.ts         # Tender detail by ID
│   │       ├── eligibility/route.ts      # Eligibility check CRUD
│   │       ├── drafts/route.ts           # Bid draft CRUD
│   │       ├── forms/route.ts            # Form checklist CRUD
│   │       └── ai/route.ts              # Claude API with tool-use
│   ├── components/
│   │   ├── sidebar.tsx                   # Light sidebar with agent nav + company footer
│   │   ├── main-header.tsx               # Breadcrumb bar + user badge
│   │   ├── chat-input.tsx                # Reusable sticky chat input bar
│   │   ├── views/
│   │   │   ├── profile-view.tsx          # Chat + card builder (split layout)
│   │   │   ├── scout-view.tsx            # Tender dashboard (stats + list)
│   │   │   ├── analyst-view.tsx          # RFP analysis cards
│   │   │   ├── compliance-view.tsx       # Eligibility checklist
│   │   │   └── writer-view.tsx           # Bid workspace (tabs + editor)
│   │   └── ui/                           # shadcn components (auto-generated)
│   ├── lib/
│   │   ├── supabase.ts                   # Supabase client (browser + server)
│   │   ├── types.ts                      # Shared TypeScript interfaces
│   │   ├── agents.ts                     # Agent config: name, color, tools, category
│   │   ├── voyage.ts                     # Voyage embedding client (server-only)
│   │   └── ai/
│   │       ├── tools.ts                  # Claude tool definitions (JSON schema)
│   │       ├── prompts.ts                # System prompts per agent mode
│   │       └── tool-handlers.ts          # Server-side tool execution logic
│   └── hooks/
│       ├── use-agent.ts                  # Agent state + navigation + locking
│       └── use-chat.ts                   # Chat messages + AI streaming
├── scripts/
│   ├── seed-tenders.ts                   # CSV parser + DB batch inserter
│   └── embed-tenders.ts                  # Voyage embedding pipeline
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql        # All tables + pgvector + indexes + RPC
├── .env.local                            # API keys (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Person 1: Data & Infrastructure

*Sets up the foundation everyone else builds on. Critical path: DB + seed data must be ready by hour 2-3.*

### Task 1.1: Create Supabase Project & Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com/dashboard → New Project → name: `bidly`. Pick the closest region. Copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service role key → `SUPABASE_SERVICE_ROLE_KEY`

Share these with the team via DM (never commit).

- [ ] **Step 2: Enable pgvector extension**

In Supabase Dashboard → SQL Editor, run:

```sql
create extension if not exists vector;
```

- [ ] **Step 3: Write migration file**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Bidly Schema
-- Following Supabase Postgres best practices:
-- - bigint identity PKs (sequential, no fragmentation)
-- - indexes on all FK columns
-- - indexes on filtered/sorted columns
-- - unique constraints for upsert targets
-- - pgvector for similarity search

-- Enable pgvector
create extension if not exists vector;

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================
create table business_profiles (
  id bigint generated always as identity primary key,
  company_name text not null,
  naics_codes text[] not null default '{}',
  location text not null default '',
  province text not null default '',
  capabilities text not null default '',
  keywords text[] not null default '{}',
  embedding vector(512),
  created_at timestamptz not null default now()
);

-- ============================================================
-- TENDERS
-- ============================================================
create table tenders (
  id bigint generated always as identity primary key,
  reference_number text unique not null,
  solicitation_number text,
  title text not null,
  description text not null default '',
  publication_date timestamptz,
  closing_date timestamptz,
  status text not null default '',
  procurement_category text not null default '',
  notice_type text not null default '',
  procurement_method text not null default '',
  selection_criteria text not null default '',
  gsin_codes text[] not null default '{}',
  unspsc_codes text[] not null default '{}',
  regions_of_opportunity text[] not null default '{}',
  regions_of_delivery text[] not null default '{}',
  trade_agreements text[] not null default '{}',
  contracting_entity text not null default '',
  notice_url text not null default '',
  attachment_urls text[] not null default '{}',
  raw_csv_data jsonb,
  created_at timestamptz not null default now()
);

-- Index on closing_date for sorting/filtering open tenders
create index tenders_closing_date_idx on tenders (closing_date);
-- Index on status for filtering
create index tenders_status_idx on tenders (status);
-- Index on procurement_category for filtering
create index tenders_procurement_category_idx on tenders (procurement_category);

-- ============================================================
-- TENDER EMBEDDINGS
-- ============================================================
create table tender_embeddings (
  id bigint generated always as identity primary key,
  tender_id bigint not null references tenders(id) on delete cascade,
  embedding vector(512) not null,
  chunk_text text not null
);

-- FK index (required for fast JOINs and CASCADE)
create index tender_embeddings_tender_id_idx on tender_embeddings (tender_id);
-- IVFFlat index for vector similarity search (create AFTER data is loaded)
-- We'll create this in a separate step after seeding

-- ============================================================
-- ELIGIBILITY CHECKS
-- ============================================================
create table eligibility_checks (
  id bigint generated always as identity primary key,
  profile_id bigint not null references business_profiles(id) on delete cascade,
  tender_id bigint not null references tenders(id) on delete cascade,
  responses jsonb not null default '{}',
  result text not null default '',
  explanation text not null default '',
  documentation_checklist jsonb not null default '[]',
  created_at timestamptz not null default now(),
  -- Unique constraint for upsert by (profile_id, tender_id)
  unique (profile_id, tender_id)
);

-- FK indexes
create index eligibility_checks_profile_id_idx on eligibility_checks (profile_id);
create index eligibility_checks_tender_id_idx on eligibility_checks (tender_id);

-- ============================================================
-- BID DRAFTS
-- ============================================================
create table bid_drafts (
  id bigint generated always as identity primary key,
  profile_id bigint not null references business_profiles(id) on delete cascade,
  tender_id bigint not null references tenders(id) on delete cascade,
  sections jsonb not null default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, tender_id)
);

create index bid_drafts_profile_id_idx on bid_drafts (profile_id);
create index bid_drafts_tender_id_idx on bid_drafts (tender_id);

-- ============================================================
-- FORM CHECKLISTS
-- ============================================================
create table form_checklists (
  id bigint generated always as identity primary key,
  profile_id bigint not null references business_profiles(id) on delete cascade,
  tender_id bigint not null references tenders(id) on delete cascade,
  forms jsonb not null default '[]',
  progress_pct integer not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, tender_id)
);

create index form_checklists_profile_id_idx on form_checklists (profile_id);
create index form_checklists_tender_id_idx on form_checklists (tender_id);

-- ============================================================
-- VECTOR SEARCH RPC
-- ============================================================
create or replace function match_tenders(
  query_embedding vector(512),
  match_count int default 20
)
returns table (
  tender_id bigint,
  similarity float
)
language sql stable
as $$
  select
    te.tender_id,
    1 - (te.embedding <=> query_embedding) as similarity
  from tender_embeddings te
  order by te.embedding <=> query_embedding
  limit match_count;
$$;
```

- [ ] **Step 4: Run migration in Supabase SQL Editor**

Copy the entire contents of `001_initial_schema.sql` into Supabase Dashboard → SQL Editor → Run.

Verify all tables appear in Table Editor.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add database schema with pgvector, indexes, and match_tenders RPC"
git push origin dev
```

---

### Task 1.2: Build CSV Seeder Script

**Files:**
- Create: `scripts/seed-tenders.ts`

**Depends on:** Task 1.1 (schema must exist)

- [ ] **Step 1: Write the seeder script**

Create `scripts/seed-tenders.ts`:

```typescript
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CSV_PATH = "./2025-2026-TenderNotice-AvisAppelOffres.csv";
const BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function splitPipes(val: string | undefined): string[] {
  if (!val || val.trim() === "") return [];
  return val.split("|").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  console.log("Reading CSV...");
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
  console.log(`Parsed ${records.length} rows`);

  // Filter: English title exists, has a closing date, status is not Expired/Cancelled
  const filtered = records.filter((r: Record<string, string>) => {
    const title = r["title-titre-eng"]?.trim();
    const status = r["tenderStatus-appelOffresStatut-eng"]?.trim();
    if (!title) return false;
    if (status === "Expired" || status === "Cancelled") return false;
    return true;
  });

  console.log(`Filtered to ${filtered.length} active tenders`);

  // Take up to 500 tenders for hackathon
  const tenders = filtered.slice(0, 500);

  // Batch insert
  for (let i = 0; i < tenders.length; i += BATCH_SIZE) {
    const batch = tenders.slice(i, i + BATCH_SIZE).map((r: Record<string, string>) => ({
      reference_number: r["referenceNumber-numeroReference"] || `UNKNOWN-${i}`,
      solicitation_number: r["solicitationNumber-numeroSollicitation"] || "",
      title: r["title-titre-eng"] || "",
      description: r["tenderDescription-descriptionAppelOffres-eng"] || "",
      publication_date: r["publicationDate-datePublication"] || null,
      closing_date: r["tenderClosingDate-appelOffresDateCloture"] || null,
      status: r["tenderStatus-appelOffresStatut-eng"] || "",
      procurement_category: r["procurementCategory-categorieApprovisionnement"] || "",
      notice_type: r["noticeType-avisType-eng"] || "",
      procurement_method: r["procurementMethod-methodeApprovisionnement-eng"] || "",
      selection_criteria: r["selectionCriteria-criteresSelection-eng"] || "",
      gsin_codes: splitPipes(r["gsin-nibs"]),
      unspsc_codes: splitPipes(r["unspsc"]),
      regions_of_opportunity: splitPipes(r["regionsOfOpportunity"]),
      regions_of_delivery: splitPipes(r["regionsOfDelivery"]),
      trade_agreements: splitPipes(r["tradeAgreements"]),
      contracting_entity: r["contractingEntityName"] || "",
      notice_url: r["noticeURL-URLavis-eng"] || "",
      attachment_urls: splitPipes(r["attachment-piecesJointes-eng"]),
      raw_csv_data: r,
    }));

    const { error } = await supabase.from("tenders").upsert(batch, {
      onConflict: "reference_number",
    });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
    } else {
      console.log(`Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
    }
  }

  console.log("Done seeding tenders!");
}

main().catch(console.error);
```

- [ ] **Step 2: Run it**

```bash
npx tsx scripts/seed-tenders.ts
```

Expected: "Inserted batch 1 (100 rows)" ... "Done seeding tenders!" with ~500 rows total.

- [ ] **Step 3: Verify in Supabase**

Go to Supabase Dashboard → Table Editor → `tenders`. Confirm rows are present with English titles and closing dates.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-tenders.ts
git commit -m "feat: add tender CSV seeder script"
git push origin dev
```

---

### Task 1.3: Build Embedding Pipeline

**Files:**
- Create: `scripts/embed-tenders.ts`
- Create: `src/lib/voyage.ts`

**Depends on:** Task 1.2 (tenders must be seeded)

- [ ] **Step 1: Get Voyage AI API key**

Go to https://dash.voyageai.com/ → create account → copy API key → add to `.env.local` as `VOYAGE_API_KEY`.

- [ ] **Step 2: Create Voyage client**

Create `src/lib/voyage.ts`:

```typescript
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

export async function getEmbeddings(
  texts: string[],
  model: string = "voyage-3-lite"
): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}
```

- [ ] **Step 3: Write embedding pipeline script**

Create `scripts/embed-tenders.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { getEmbeddings } from "../src/lib/voyage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 20; // Voyage free tier: max ~128 texts per call, keep small

async function main() {
  // Get tenders that don't have embeddings yet
  const { data: tenders, error } = await supabase
    .from("tenders")
    .select("id, title, description")
    .order("id");

  if (error) throw error;
  console.log(`Found ${tenders.length} tenders to embed`);

  let embedded = 0;
  for (let i = 0; i < tenders.length; i += BATCH_SIZE) {
    const batch = tenders.slice(i, i + BATCH_SIZE);
    const texts = batch.map(
      (t) => `${t.title}\n\n${t.description}`.slice(0, 2000) // truncate long descriptions
    );

    try {
      const embeddings = await getEmbeddings(texts);

      const rows = batch.map((t, idx) => ({
        tender_id: t.id,
        embedding: JSON.stringify(embeddings[idx]),
        chunk_text: texts[idx],
      }));

      const { error: insertError } = await supabase
        .from("tender_embeddings")
        .insert(rows);

      if (insertError) {
        console.error(`Batch ${i / BATCH_SIZE + 1} insert failed:`, insertError.message);
      } else {
        embedded += batch.length;
        console.log(`Embedded batch ${i / BATCH_SIZE + 1} (${embedded}/${tenders.length})`);
      }
    } catch (err) {
      console.error(`Batch ${i / BATCH_SIZE + 1} embedding failed, skipping:`, err);
    }

    // Rate limit: 300 RPM on free tier, so ~100ms between batches is safe
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nEmbedded ${embedded} tenders. Creating IVFFlat index...`);

  // Create IVFFlat index AFTER data is loaded (needs rows to build lists)
  const lists = Math.max(1, Math.floor(Math.sqrt(embedded)));
  const { error: indexError } = await supabase.rpc("exec_sql", {
    query: `create index if not exists tender_embeddings_ivfflat_idx
            on tender_embeddings
            using ivfflat (embedding vector_cosine_ops)
            with (lists = ${lists});`,
  });

  // If RPC doesn't exist, print the SQL for manual execution
  if (indexError) {
    console.log("\nRun this SQL manually in Supabase SQL Editor:");
    console.log(`CREATE INDEX IF NOT EXISTS tender_embeddings_ivfflat_idx
  ON tender_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = ${lists});`);
  } else {
    console.log("IVFFlat index created!");
  }

  console.log("Done!");
}

main().catch(console.error);
```

- [ ] **Step 4: Run it**

```bash
npx tsx scripts/embed-tenders.ts
```

Expected: "Embedded batch 1 (20/500)" ... "Done!" Takes ~5 minutes for 500 tenders.

- [ ] **Step 5: Create the IVFFlat index if the script couldn't**

In Supabase SQL Editor:

```sql
create index if not exists tender_embeddings_ivfflat_idx
on tender_embeddings
using ivfflat (embedding vector_cosine_ops)
with (lists = 22);
```

(Adjust `lists` = sqrt(number of rows). For 500 rows, lists = 22.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/voyage.ts scripts/embed-tenders.ts
git commit -m "feat: add Voyage embedding client and tender embedding pipeline"
git push origin dev
```

---

### Task 1.4: Seed Demo Business Profile

**Depends on:** Task 1.3 (need embeddings for verification)

- [ ] **Step 1: Insert demo profile via Supabase SQL Editor**

```sql
insert into business_profiles (company_name, naics_codes, location, province, capabilities, keywords)
values (
  'Amato Plumbing Inc.',
  ARRAY['238220'],
  'Toronto, Ontario',
  'Ontario',
  'Commercial plumbing, water main installation and repair, backflow prevention, hydrant servicing, storm and sanitary sewer work. Typical projects $200K-$2.5M. WSIB certified, bonded to $3M, $2M liability insurance.',
  ARRAY['plumbing', 'water main', 'sewer', 'backflow', 'hydrant', 'pipe installation', 'excavation']
);
```

- [ ] **Step 2: Embed the profile**

In the SQL Editor, first get the profile text. Then use the API to embed it. For the hackathon, we can do this manually or add a quick script. The AI route will handle embedding on profile save in production.

- [ ] **Step 3: Test vector search**

In SQL Editor:

```sql
select t.id, t.title, t.closing_date, 1 - (te.embedding <=> (
  select embedding from tender_embeddings limit 1
)) as similarity
from tender_embeddings te
join tenders t on t.id = te.tender_id
order by similarity desc
limit 5;
```

Expected: Returns 5 tenders ranked by similarity. Titles should be somewhat related.

- [ ] **Step 4: Tell the team the database is ready**

Share in team chat:
- "DB is seeded with ~500 tenders + embeddings. Demo profile ID is 1. You can pull and start using Supabase."

---

## Person 2: Frontend & UI

*Builds all React components. Can start immediately — uses mock data until API routes are ready.*

### Task 2.1: Set Up Design System & Layout Shell

**Files:**
- Create: `src/app/globals.css` (replace default)
- Create: `src/app/layout.tsx` (replace default)
- Create: `src/app/page.tsx` (replace default)
- Create: `src/lib/agents.ts`
- Create: `src/lib/types.ts`
- Create: `src/hooks/use-agent.ts`

- [ ] **Step 1: Define shared types**

Create `src/lib/types.ts`:

```typescript
export interface BusinessProfile {
  id: number;
  company_name: string;
  naics_codes: string[];
  location: string;
  province: string;
  capabilities: string;
  keywords: string[];
  created_at: string;
}

export interface Tender {
  id: number;
  reference_number: string;
  solicitation_number: string;
  title: string;
  description: string;
  publication_date: string;
  closing_date: string;
  status: string;
  procurement_category: string;
  notice_type: string;
  procurement_method: string;
  selection_criteria: string;
  gsin_codes: string[];
  unspsc_codes: string[];
  regions_of_opportunity: string[];
  regions_of_delivery: string[];
  trade_agreements: string[];
  contracting_entity: string;
  notice_url: string;
  attachment_urls: string[];
  match_score?: number;
}

export interface EligibilityCheck {
  id: number;
  profile_id: number;
  tender_id: number;
  responses: Record<string, string>;
  result: "pass" | "fail" | "conditional";
  explanation: string;
  documentation_checklist: { item: string; required: boolean; status: string }[];
  created_at: string;
}

export interface BidDraft {
  id: number;
  profile_id: number;
  tender_id: number;
  sections: {
    exec_summary?: string;
    technical?: string;
    team?: string;
    project_mgmt?: string;
    safety?: string;
    pricing?: string;
  };
  status: "draft" | "complete";
  created_at: string;
  updated_at: string;
}

export interface FormChecklistItem {
  name: string;
  status: "not_started" | "in_progress" | "done";
  guidance?: string;
  download_url?: string;
}

export interface FormChecklist {
  id: number;
  profile_id: number;
  tender_id: number;
  forms: FormChecklistItem[];
  progress_pct: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type AgentId = "profile" | "scout" | "analyst" | "compliance" | "writer";

export type AgentStatus = "locked" | "active" | "completed";
```

- [ ] **Step 2: Define agent configuration**

Create `src/lib/agents.ts`:

```typescript
import { AgentId } from "./types";

export interface AgentConfig {
  id: AgentId;
  name: string;
  color: string;
  category: "Setup" | "Research" | "Execute";
  breadcrumbLabel: string;
  chatPlaceholder: string;
}

export const AGENTS: AgentConfig[] = [
  {
    id: "profile",
    name: "Profile",
    color: "#e67e22",
    category: "Setup",
    breadcrumbLabel: "Company Setup",
    chatPlaceholder: "Tell the Profile Agent about your business...",
  },
  {
    id: "scout",
    name: "Scout",
    color: "#3b82f6",
    category: "Research",
    breadcrumbLabel: "Tender Search",
    chatPlaceholder:
      "Ask Scout to refine results — 'show me federal contracts only' or 'anything closing this month?'",
  },
  {
    id: "analyst",
    name: "Analyst",
    color: "#06b6d4",
    category: "Research",
    breadcrumbLabel: "RFP Analysis",
    chatPlaceholder:
      "Ask about this RFP — requirements, risks, evaluation details...",
  },
  {
    id: "compliance",
    name: "Compliance",
    color: "#10b981",
    category: "Execute",
    breadcrumbLabel: "Eligibility Check",
    chatPlaceholder:
      "Ask about requirements — 'what insurance do I need?' or 'explain Buy Canadian policy'",
  },
  {
    id: "writer",
    name: "Writer",
    color: "#8b5cf6",
    category: "Execute",
    breadcrumbLabel: "Bid Workspace",
    chatPlaceholder:
      "'Make this more concise', 'add our traffic management experience', 'regenerate pricing'...",
  },
];

export const AGENT_ORDER: AgentId[] = ["profile", "scout", "analyst", "compliance", "writer"];

export function getAgent(id: AgentId): AgentConfig {
  return AGENTS.find((a) => a.id === id)!;
}
```

- [ ] **Step 3: Create agent state hook**

Create `src/hooks/use-agent.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { AgentId, AgentStatus, BusinessProfile, Tender } from "@/lib/types";
import { AGENT_ORDER } from "@/lib/agents";

interface AgentState {
  activeAgent: AgentId;
  statuses: Record<AgentId, AgentStatus>;
  profile: BusinessProfile | null;
  selectedTender: Tender | null;
  setActiveAgent: (id: AgentId) => void;
  completeAgent: (id: AgentId) => void;
  setProfile: (p: BusinessProfile) => void;
  setSelectedTender: (t: Tender) => void;
}

export function useAgent(): AgentState {
  const [activeAgent, setActiveAgentRaw] = useState<AgentId>("profile");
  const [statuses, setStatuses] = useState<Record<AgentId, AgentStatus>>({
    profile: "active",
    scout: "locked",
    analyst: "locked",
    compliance: "locked",
    writer: "locked",
  });
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  const setActiveAgent = useCallback(
    (id: AgentId) => {
      if (statuses[id] === "locked") return;
      setActiveAgentRaw(id);
      setStatuses((prev) => {
        const next = { ...prev };
        // Set the target as active (unless it's already completed and we're revisiting)
        if (next[id] !== "completed") {
          next[id] = "active";
        }
        return next;
      });
    },
    [statuses]
  );

  const completeAgent = useCallback((id: AgentId) => {
    setStatuses((prev) => {
      const next = { ...prev };
      next[id] = "completed";
      // Unlock next agent
      const idx = AGENT_ORDER.indexOf(id);
      if (idx < AGENT_ORDER.length - 1) {
        const nextId = AGENT_ORDER[idx + 1];
        if (next[nextId] === "locked") {
          next[nextId] = "active";
        }
      }
      return next;
    });
  }, []);

  return {
    activeAgent,
    statuses,
    profile,
    selectedTender,
    setActiveAgent,
    completeAgent,
    setProfile,
    setSelectedTender,
  };
}
```

- [ ] **Step 4: Set up CSS design tokens**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #f8f7f5;
  --white: #ffffff;
  --sidebar-bg: #fbfaf9;
  --border: #e8e5e0;
  --border-light: #f0ede8;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6560;
  --text-muted: #a09a94;
  --text-hint: #c4bfb8;
  --accent-red: #c41e3a;
  --agent-profile: #e67e22;
  --agent-scout: #3b82f6;
  --agent-analyst: #06b6d4;
  --agent-compliance: #10b981;
  --agent-writer: #8b5cf6;
  --success: #1a7a4c;
}

body {
  background: var(--bg);
  color: var(--text-primary);
  font-family: var(--font-sans);
}
```

- [ ] **Step 5: Set up root layout with fonts**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

// DM Serif Display loaded via <link> tag in <head> below

export const metadata: Metadata = {
  title: "Bidly — Procurement Assistant",
  description: "AI-powered Canadian government tender assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${plexMono.variable} ${plexSans.variable} antialiased`}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create main page shell**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useAgent } from "@/hooks/use-agent";
import { Sidebar } from "@/components/sidebar";
import { MainHeader } from "@/components/main-header";
import { ProfileView } from "@/components/views/profile-view";
import { ScoutView } from "@/components/views/scout-view";
import { AnalystView } from "@/components/views/analyst-view";
import { ComplianceView } from "@/components/views/compliance-view";
import { WriterView } from "@/components/views/writer-view";

export default function Home() {
  const agent = useAgent();

  const views = {
    profile: <ProfileView agent={agent} />,
    scout: <ScoutView agent={agent} />,
    analyst: <AnalystView agent={agent} />,
    compliance: <ComplianceView agent={agent} />,
    writer: <WriterView agent={agent} />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeAgent={agent.activeAgent}
        statuses={agent.statuses}
        profile={agent.profile}
        onAgentClick={agent.setActiveAgent}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MainHeader activeAgent={agent.activeAgent} />
        <div className="flex-1 overflow-y-auto">
          {views[agent.activeAgent]}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/agents.ts src/hooks/use-agent.ts src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add design system tokens, types, agent config, layout shell"
git push origin dev
```

---

### Task 2.2: Build Sidebar & Main Header

**Files:**
- Create: `src/components/sidebar.tsx`
- Create: `src/components/main-header.tsx`

**Reference mockup:** `.superpowers/brainstorm/10729-1774195258/agentic-light-sidebar-v2.html`

- [ ] **Step 1: Build the sidebar component**

Create `src/components/sidebar.tsx`:

```tsx
"use client";

import { AgentId, AgentStatus, BusinessProfile } from "@/lib/types";
import { AGENTS } from "@/lib/agents";

interface SidebarProps {
  activeAgent: AgentId;
  statuses: Record<AgentId, AgentStatus>;
  profile: BusinessProfile | null;
  onAgentClick: (id: AgentId) => void;
}

const CATEGORIES = ["Setup", "Research", "Execute"] as const;
const CATEGORY_ICONS: Record<string, string> = {
  Setup: "⚙",
  Research: "◆",
  Execute: "◼",
};

export function Sidebar({ activeAgent, statuses, profile, onAgentClick }: SidebarProps) {
  return (
    <aside
      className="w-[220px] flex flex-col flex-shrink-0 border-r"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      {/* Brand */}
      <div className="px-6 pt-6 pb-8 flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: "var(--text-primary)" }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span
          className="text-[15px] font-semibold tracking-wide"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Bidly
        </span>
      </div>

      {/* Agent Groups */}
      {CATEGORIES.map((category) => {
        const agents = AGENTS.filter((a) => a.category === category);
        return (
          <div key={category} className="mb-7">
            <div
              className="px-6 mb-2 flex items-center gap-2 text-[10px] font-medium tracking-[2px] uppercase"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              <span className="text-[13px] opacity-60">{CATEGORY_ICONS[category]}</span>
              {category}
            </div>
            {agents.map((agent) => {
              const status = statuses[agent.id];
              const isActive = agent.id === activeAgent;
              const isLocked = status === "locked";
              const isCompleted = status === "completed";

              return (
                <button
                  key={agent.id}
                  onClick={() => onAgentClick(agent.id)}
                  disabled={isLocked}
                  className="w-full text-left relative flex items-center gap-2 px-6 py-2 text-[12px] font-medium tracking-[0.8px] uppercase transition-colors"
                  style={{
                    fontFamily: "var(--font-mono)",
                    paddingLeft: "28px",
                    color: isCompleted
                      ? "var(--success)"
                      : isActive
                        ? "var(--text-primary)"
                        : isLocked
                          ? "var(--text-hint)"
                          : "var(--text-secondary)",
                    background: isActive ? "var(--white)" : "transparent",
                    fontWeight: isActive ? 600 : 500,
                    cursor: isLocked ? "default" : "pointer",
                  }}
                >
                  {/* Active left border */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: agent.color }}
                    />
                  )}

                  {/* Status indicator */}
                  {isCompleted ? (
                    <span className="text-[11px]" style={{ color: "var(--success)" }}>
                      ✓
                    </span>
                  ) : (
                    <span
                      className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                      style={{
                        background: agent.color,
                        opacity: isLocked ? 0.25 : 1,
                      }}
                    />
                  )}

                  {agent.name}

                  {/* Blinking cursor for active */}
                  {isActive && (
                    <span
                      className="w-2 h-3.5 animate-pulse"
                      style={{ background: "var(--text-primary)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Footer */}
      <div
        className="mt-auto px-6 py-5 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        {profile ? (
          <>
            <div
              className="text-[11px] font-medium mb-0.5"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}
            >
              {profile.company_name}
            </div>
            <div
              className="text-[10px]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              {profile.province} • {profile.naics_codes[0] || ""}
            </div>
          </>
        ) : (
          <div
            className="text-[11px] italic"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
          >
            No profile yet
          </div>
        )}
        <div
          className="mt-4 text-[9px] tracking-wide"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
        >
          Bidly v1.0
          <br />© 2026 Hackathon Build
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Build the main header**

Create `src/components/main-header.tsx`:

```tsx
import { AgentId } from "@/lib/types";
import { getAgent } from "@/lib/agents";

interface MainHeaderProps {
  activeAgent: AgentId;
}

export function MainHeader({ activeAgent }: MainHeaderProps) {
  const agent = getAgent(activeAgent);

  return (
    <div
      className="px-10 py-5 flex items-center justify-between flex-shrink-0 border-b"
      style={{ background: "var(--white)", borderColor: "var(--border)" }}
    >
      <div
        className="text-[11px] tracking-[1.5px] uppercase"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
      >
        {agent.name}
        <span className="mx-1.5" style={{ color: "var(--text-hint)" }}>
          •
        </span>
        <span style={{ color: "var(--text-secondary)" }}>
          {agent.breadcrumbLabel}
        </span>
      </div>
      <div
        className="flex items-center gap-2 text-[12px]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}
      >
        <span>Demo Mode</span>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[12px]"
          style={{ background: "var(--border)", color: "var(--text-secondary)" }}
        >
          A
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create chat input component**

Create `src/components/chat-input.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AgentId } from "@/lib/types";
import { getAgent } from "@/lib/agents";

interface ChatInputProps {
  agentId: AgentId;
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ agentId, onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const agent = getAgent(agentId);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div
      className="sticky bottom-0 px-10 py-4 pb-6"
      style={{
        background: "linear-gradient(transparent, var(--bg) 20%)",
      }}
    >
      <div
        className="flex border"
        style={{ borderColor: "var(--border)", background: "var(--white)" }}
      >
        <div
          className="px-4 py-3.5 border-r text-[10px] tracking-[1.5px] uppercase whitespace-nowrap flex items-center"
          style={{
            fontFamily: "var(--font-mono)",
            color: agent.color,
            borderColor: "var(--border)",
            background: "var(--sidebar-bg)",
          }}
        >
          {agent.name}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={agent.chatPlaceholder}
          disabled={disabled}
          className="flex-1 border-none outline-none text-sm px-4 py-3.5"
          style={{
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
            background: "transparent",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="px-6 py-3.5 text-[11px] font-semibold tracking-[1.5px] uppercase border-none cursor-pointer"
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--text-primary)",
            color: "var(--white)",
          }}
        >
          {agentId === "profile" ? "Send" : "Ask"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create placeholder views so the app renders**

Create minimal placeholder files for each view. We'll flesh them out in subsequent tasks.

Create `src/components/views/profile-view.tsx`:

```tsx
"use client";

export function ProfileView({ agent }: { agent: any }) {
  return (
    <div className="p-10">
      <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28 }}>
        Let&apos;s set up your profile
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        Profile agent view — coming soon
      </p>
    </div>
  );
}
```

Create identical placeholders for `scout-view.tsx`, `analyst-view.tsx`, `compliance-view.tsx`, `writer-view.tsx` with appropriate titles.

- [ ] **Step 5: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000. You should see:
- Light sidebar with 5 agents grouped into Setup/Research/Execute
- Profile is active (orange left border + cursor)
- All others are locked (greyed out)
- Main header shows "PROFILE • Company Setup"
- Placeholder content in main area

- [ ] **Step 6: Commit**

```bash
git add src/components/sidebar.tsx src/components/main-header.tsx src/components/chat-input.tsx src/components/views/
git commit -m "feat: add sidebar, main header, chat input, and placeholder views"
git push origin dev
```

---

### Task 2.3: Build Profile View (Chat + Card Builder)

**Files:**
- Modify: `src/components/views/profile-view.tsx`

**Reference mockup:** `.superpowers/brainstorm/10729-1774195258/agent-profile.html`

- [ ] **Step 1: Implement the full profile view**

Replace `src/components/views/profile-view.tsx` with the chat column + profile cards panel layout as shown in the mockup. Key elements:

- Left side (420px): chat messages list + input area
- Right side (flex-1): progress bar + profile cards that build up
- Messages alternate between agent questions and user answers
- Suggested answer chips for multiple-choice questions (province selection)
- Cards animate in with CSS transitions
- In-progress card has dashed orange border
- Empty cards have dashed grey border
- On profile completion: call `agent.completeAgent("profile")` and `agent.setProfile(data)` to unlock Scout

The component manages its own chat state and profile-building state. It calls `/api/ai` to get the Profile agent's responses and `/api/profile` to save the completed profile.

**Note for Person 2:** Build the UI with hardcoded mock responses first. Person 3 will wire the AI later. Use this pattern:

```tsx
// Mock: replace with API call later
const mockResponses: Record<number, string> = {
  0: "Welcome to Bidly! I'll help you find and bid on government contracts. First, what's your company name?",
  1: "Great! What province are you based in?",
  2: "What services does your company provide?",
  3: "What's your typical project size range and do you have certifications like WSIB or bonding?",
  4: "Here's your profile — does everything look right?",
};
```

- [ ] **Step 2: Test locally**

Verify: sidebar shows Profile active, chat shows first question, typing a response adds a card on the right.

- [ ] **Step 3: Commit**

```bash
git add src/components/views/profile-view.tsx
git commit -m "feat: add profile view with chat + card builder"
git push origin dev
```

---

### Task 2.4: Build Scout View (Tender Dashboard)

**Files:**
- Modify: `src/components/views/scout-view.tsx`

**Reference mockup:** `.superpowers/brainstorm/10729-1774195258/agent-scout.html`

- [ ] **Step 1: Implement the scout view**

Build the full tender dashboard:
- Filter bar (connected button group)
- Stats row (4 cards: Total Matches, High Match, Closing Soon, Avg Score)
- Tender list (match %, title, meta, tags, "Analyze →" button)
- ChatInput at bottom

Use mock tender data initially. "Analyze →" button calls `agent.setSelectedTender(tender)`, `agent.completeAgent("scout")`, and `agent.setActiveAgent("analyst")`.

- [ ] **Step 2: Commit**

```bash
git add src/components/views/scout-view.tsx
git commit -m "feat: add scout view with tender dashboard"
git push origin dev
```

---

### Task 2.5: Build Analyst View (RFP Analysis)

**Files:**
- Modify: `src/components/views/analyst-view.tsx`

**Reference mockup:** `.superpowers/brainstorm/10729-1774195258/agentic-light-sidebar-v2.html`

- [ ] **Step 1: Implement the analyst view**

Build:
- Title row with tender name + action buttons
- 2×2 card grid: What They Want, Key Deadlines, Mandatory Forms, Evaluation Criteria
- Disqualification Risks wide card
- ChatInput at bottom
- "Begin Compliance →" button transitions to compliance agent

Use `agent.selectedTender` for the tender data. AI summary will be wired by Person 3.

- [ ] **Step 2: Commit**

```bash
git add src/components/views/analyst-view.tsx
git commit -m "feat: add analyst view with RFP analysis cards"
git push origin dev
```

---

### Task 2.6: Build Compliance View (Eligibility Checklist)

**Files:**
- Modify: `src/components/views/compliance-view.tsx`

**Reference mockup:** `.superpowers/brainstorm/10729-1774195258/agent-compliance.html`

- [ ] **Step 1: Implement the compliance view**

Build:
- Result banner (3 cards: Overall Eligibility, Requirements Met, Action Required)
- Grouped checklists: Buy Canadian, Qualifications, Mandatory Steps, Documentation
- Each item has status icon (pass/fail/warn/pending), name, description, action link
- "Begin Bid Draft →" transitions to writer agent

Use mock eligibility data initially.

- [ ] **Step 2: Commit**

```bash
git add src/components/views/compliance-view.tsx
git commit -m "feat: add compliance view with eligibility checklist"
git push origin dev
```

---

### Task 2.7: Build Writer View (Bid Workspace)

**Files:**
- Modify: `src/components/views/writer-view.tsx`

**Reference mockup:** `.superpowers/brainstorm/10729-1774195258/agent-writer.html`

- [ ] **Step 1: Implement the writer view**

Build split layout:
- Left (200px): section tabs with status indicators
- Right (flex-1): editor toolbar + contenteditable blocks + AI suggestions + pricing table
- Regenerate/Copy/Save actions
- ChatInput at bottom of editor area

Use mock draft content initially.

- [ ] **Step 2: Commit**

```bash
git add src/components/views/writer-view.tsx
git commit -m "feat: add writer view with bid workspace editor"
git push origin dev
```

---

## Person 3: AI & Tools

*All Claude + Voyage integration. Can start immediately on tool definitions; needs DB access from hour 2-3.*

### Task 3.1: Claude API Route + Tool Definitions

**Files:**
- Create: `src/lib/ai/tools.ts`
- Create: `src/lib/ai/prompts.ts`
- Create: `src/lib/ai/tool-handlers.ts`
- Create: `src/app/api/ai/route.ts`

- [ ] **Step 1: Define Claude tool schemas**

Create `src/lib/ai/tools.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "searchTenders",
    description:
      "Search for tenders matching a query. Uses vector similarity if query provided, otherwise filters by criteria.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Natural language search query (optional)",
        },
        category: {
          type: "string",
          description: "Filter by procurement category: CNST, GD, SRV, SRVTGD",
        },
        region: {
          type: "string",
          description: "Filter by region",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "getTenderDetails",
    description: "Get full details for a specific tender by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        tender_id: { type: "number", description: "The tender ID" },
      },
      required: ["tender_id"],
    },
  },
  {
    name: "summarizeTender",
    description:
      "Generate a plain-language summary of a tender. Returns: what they want, deadlines, forms, evaluation criteria, risks.",
    input_schema: {
      type: "object" as const,
      properties: {
        tender_id: { type: "number", description: "The tender ID to summarize" },
      },
      required: ["tender_id"],
    },
  },
  {
    name: "checkEligibility",
    description:
      "Check if a business profile is eligible for a specific tender. Returns pass/fail with explanation.",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
        tender_id: { type: "number" },
        questionnaire_responses: {
          type: "object",
          description: "User responses to eligibility questions",
        },
      },
      required: ["profile_id", "tender_id"],
    },
  },
  {
    name: "getFormChecklist",
    description: "Get required forms for a tender",
    input_schema: {
      type: "object" as const,
      properties: {
        tender_id: { type: "number" },
      },
      required: ["tender_id"],
    },
  },
  {
    name: "explainForm",
    description: "Explain a specific form in plain language",
    input_schema: {
      type: "object" as const,
      properties: {
        form_name: { type: "string" },
        tender_context: { type: "string" },
      },
      required: ["form_name"],
    },
  },
  {
    name: "draftBidSection",
    description: "Draft a section of the bid proposal",
    input_schema: {
      type: "object" as const,
      properties: {
        section_type: {
          type: "string",
          enum: ["exec_summary", "technical", "team", "project_mgmt", "safety"],
        },
        tender_id: { type: "number" },
        profile_id: { type: "number" },
      },
      required: ["section_type", "tender_id", "profile_id"],
    },
  },
  {
    name: "calculatePricing",
    description: "Calculate pricing schedule with GST/HST",
    input_schema: {
      type: "object" as const,
      properties: {
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              amount: { type: "number" },
            },
          },
        },
        province: { type: "string" },
      },
      required: ["line_items", "province"],
    },
  },
  {
    name: "getCompanyProfile",
    description: "Get the business profile",
    input_schema: {
      type: "object" as const,
      properties: {
        profile_id: { type: "number" },
      },
      required: ["profile_id"],
    },
  },
  {
    name: "saveProgress",
    description: "Save progress for eligibility, drafts, or forms",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["profile", "eligibility", "draft", "forms"],
        },
        data: { type: "object" },
      },
      required: ["type", "data"],
    },
  },
];
```

- [ ] **Step 2: Define agent system prompts**

Create `src/lib/ai/prompts.ts`:

```typescript
import { AgentId } from "@/lib/types";

export function getSystemPrompt(agentId: AgentId, profileContext: string): string {
  const base = `You are Bidly, an AI procurement assistant for Canadian businesses.
${profileContext ? `The user's company profile: ${profileContext}` : ""}
You help them find, understand, and bid on government tenders.`;

  const agentPrompts: Record<AgentId, string> = {
    profile: `${base}

You are the Profile Agent. Your job is to collect company information through natural conversation.
Ask ONE question at a time. Be friendly and clear.
Questions to ask (in order):
1. Company name
2. Province (suggest: Ontario, BC, Alberta, Quebec, Other)
3. Services/capabilities (free text — you'll extract NAICS codes and keywords)
4. Typical project size range and certifications (WSIB, bonding, insurance)
5. Review the profile and confirm

When the user describes services, identify the NAICS code (e.g., plumbing → 238220) and relevant keywords.
After collecting all info, present a summary and ask for confirmation.`,

    scout: `${base}

You are the Scout Agent. You find and match government tenders to the user's profile.
Use the searchTenders tool to find relevant opportunities.
Present results highlighting: match score, title, closing date, estimated value.
Help users refine their search with filters and follow-up queries.`,

    analyst: `${base}

You are the Analyst Agent. You analyze RFP documents and extract key information.
When summarizing a tender, ALWAYS structure output as:
- What they want (plain-language scope)
- Key deadlines (closing date, site visits, questions deadline)
- Mandatory forms (list with REQUIRED tags)
- Evaluation criteria (scoring weights)
- Disqualification risks (what will get you eliminated)`,

    compliance: `${base}

You are the Compliance Agent. You check eligibility for Buy Canadian policy and other requirements.
Assess: Canadian business registration, trade agreement compliance, certifications, insurance levels, bonding capacity, mandatory site visits.
Return clear pass/fail/warning for each requirement with explanations.`,

    writer: `${base}

You are the Writer Agent. You draft bid proposal sections.
Draft professional, specific content using the company profile and tender requirements.
For each section: provide the draft text and suggest improvements.
Support: executive summary, technical approach, team experience, project management, safety plan.
Also handle pricing calculations with correct GST/HST for the province.`,
  };

  return agentPrompts[agentId];
}

export const AGENT_TOOLS: Record<AgentId, string[]> = {
  profile: ["getCompanyProfile", "saveProgress"],
  scout: ["searchTenders", "getCompanyProfile"],
  analyst: ["getTenderDetails", "summarizeTender", "getFormChecklist"],
  compliance: ["checkEligibility", "getCompanyProfile"],
  writer: ["draftBidSection", "explainForm", "calculatePricing", "saveProgress"],
};
```

- [ ] **Step 3: Implement tool handlers**

Create `src/lib/ai/tool-handlers.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { getEmbeddings } from "@/lib/voyage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  switch (toolName) {
    case "searchTenders":
      return await searchTenders(toolInput);
    case "getTenderDetails":
      return await getTenderDetails(toolInput);
    case "getCompanyProfile":
      return await getCompanyProfile(toolInput);
    case "saveProgress":
      return await saveProgress(toolInput);
    case "checkEligibility":
      return JSON.stringify({
        note: "Eligibility check is performed by the AI based on profile and tender data. Return your assessment directly.",
      });
    case "summarizeTender":
      return await getTenderDetails(toolInput); // Return raw data, AI summarizes
    case "getFormChecklist":
      return await getTenderDetails(toolInput); // AI extracts forms from description
    case "draftBidSection":
      return JSON.stringify({
        note: "Draft the section based on the profile and tender context provided in the conversation.",
      });
    case "explainForm":
      return JSON.stringify({
        note: "Explain the form based on your knowledge of Canadian procurement.",
      });
    case "calculatePricing":
      return calculatePricing(toolInput);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function searchTenders(input: Record<string, any>): Promise<string> {
  const { query, category, region, limit = 20 } = input;

  if (query) {
    // Vector similarity search
    const [embedding] = await getEmbeddings([query]);
    const { data, error } = await supabase.rpc("match_tenders", {
      query_embedding: JSON.stringify(embedding),
      match_count: limit,
    });

    if (error) return JSON.stringify({ error: error.message });

    // Fetch full tender details for matched IDs
    const tenderIds = data.map((d: any) => d.tender_id);
    const { data: tenders } = await supabase
      .from("tenders")
      .select("*")
      .in("id", tenderIds);

    // Merge similarity scores
    const results = tenders?.map((t: any) => ({
      ...t,
      match_score: Math.round(
        (data.find((d: any) => d.tender_id === t.id)?.similarity || 0) * 100
      ),
    }));

    results?.sort((a: any, b: any) => b.match_score - a.match_score);
    return JSON.stringify(results || []);
  }

  // Filter-based search
  let q = supabase.from("tenders").select("*").order("closing_date", { ascending: true }).limit(limit);

  if (category) q = q.eq("procurement_category", category);
  if (region) q = q.contains("regions_of_delivery", [region]);

  const { data, error } = await q;
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data || []);
}

async function getTenderDetails(input: Record<string, any>): Promise<string> {
  const { tender_id } = input;
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", tender_id)
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function getCompanyProfile(input: Record<string, any>): Promise<string> {
  const { profile_id } = input;
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", profile_id)
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data);
}

async function saveProgress(input: Record<string, any>): Promise<string> {
  const { type, data } = input;
  const tableMap: Record<string, string> = {
    profile: "business_profiles",
    eligibility: "eligibility_checks",
    draft: "bid_drafts",
    forms: "form_checklists",
  };

  const table = tableMap[type];
  if (!table) return JSON.stringify({ error: `Unknown save type: ${type}` });

  if (type === "profile") {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data)
      .select()
      .single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify(result);
  }

  // For other types, upsert by (profile_id, tender_id)
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, { onConflict: "profile_id,tender_id" })
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(result);
}

function calculatePricing(input: Record<string, any>): string {
  const { line_items = [], province = "Ontario" } = input;
  const hstRates: Record<string, number> = {
    Ontario: 0.13,
    "British Columbia": 0.12,
    Alberta: 0.05,
    Quebec: 0.14975,
    "Nova Scotia": 0.15,
    "New Brunswick": 0.15,
    Manitoba: 0.12,
    Saskatchewan: 0.11,
    "Prince Edward Island": 0.15,
    Newfoundland: 0.15,
  };

  const rate = hstRates[province] || 0.13;
  const subtotal = line_items.reduce(
    (sum: number, item: any) => sum + (item.amount || 0),
    0
  );
  const tax = subtotal * rate;

  return JSON.stringify({
    line_items,
    subtotal,
    tax_rate: rate,
    tax_label: province === "Alberta" ? "GST (5%)" : `HST (${(rate * 100).toFixed(1)}%)`,
    tax_amount: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
    province,
  });
}
```

- [ ] **Step 4: Create the AI API route**

Create `src/app/api/ai/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { getSystemPrompt, AGENT_TOOLS } from "@/lib/ai/prompts";
import { handleToolCall } from "@/lib/ai/tool-handlers";
import { AgentId, ChatMessage } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { agentId, messages, profileContext } = (await request.json()) as {
      agentId: AgentId;
      messages: ChatMessage[];
      profileContext?: string;
    };

    // Filter tools to only those available for this agent
    const allowedTools = AGENT_TOOLS[agentId] || [];
    const tools = TOOL_DEFINITIONS.filter((t) =>
      allowedTools.includes(t.name)
    );

    const systemPrompt = getSystemPrompt(agentId, profileContext || "");

    // Convert ChatMessages to Anthropic format
    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Call Claude with tool-use loop
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      messages: anthropicMessages,
    });

    // Handle tool-use loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: await handleToolCall(
            block.name,
            block.input as Record<string, any>
          ),
        }))
      );

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: [
          ...anthropicMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
      });
    }

    // Extract text from response
    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ content: textContent });
  } catch (error: any) {
    console.error("AI route error:", error);
    return NextResponse.json(
      { error: error.message || "AI request failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/ src/app/api/ai/route.ts
git commit -m "feat: add Claude AI route with tool-use, system prompts, and tool handlers"
git push origin dev
```

---

### Task 3.2: Create Chat Hook

**Files:**
- Create: `src/hooks/use-chat.ts`

- [ ] **Step 1: Build the chat hook**

Create `src/hooks/use-chat.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { AgentId, ChatMessage } from "@/lib/types";

export function useChat(agentId: AgentId) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, profileContext?: string) => {
      setError(null);
      const userMessage: ChatMessage = {
        role: "user",
        content,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            messages: updatedMessages,
            profileContext,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI request failed: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [agentId, messages]
  );

  const addInitialMessage = useCallback((content: string) => {
    setMessages([
      { role: "assistant", content, timestamp: Date.now() },
    ]);
  }, []);

  return { messages, isLoading, error, sendMessage, addInitialMessage };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-chat.ts
git commit -m "feat: add useChat hook for AI conversation state"
git push origin dev
```

---

## Person 4: API Routes & Integration

*Connects frontend to Supabase. Can start immediately on client setup; needs DB from hour 1-2.*

### Task 4.1: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

// Browser client (uses anon key, respects RLS)
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server client (uses service role key, bypasses RLS)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client helpers"
git push origin dev
```

---

### Task 4.2: CRUD API Routes

**Files:**
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/api/tenders/route.ts`
- Create: `src/app/api/tenders/[id]/route.ts`
- Create: `src/app/api/eligibility/route.ts`
- Create: `src/app/api/drafts/route.ts`
- Create: `src/app/api/forms/route.ts`

**Depends on:** Task 4.1 + Task 1.1 (schema must exist)

- [ ] **Step 1: Profile route**

Create `src/app/api/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServerClient();
  // For hackathon: return the first (demo) profile
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .order("id")
    .limit(1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("business_profiles")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from("business_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Tenders list/search route**

Create `src/app/api/tenders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("tenders")
    .select("*")
    .order("closing_date", { ascending: true })
    .limit(limit);

  if (category) query = query.eq("procurement_category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Tender detail route**

Create `src/app/api/tenders/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", parseInt(id))
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Eligibility, drafts, forms routes**

Create `src/app/api/eligibility/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");
  const tenderId = searchParams.get("tender_id");

  if (!profileId || !tenderId) {
    return NextResponse.json({ error: "profile_id and tender_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("eligibility_checks")
    .select("*")
    .eq("profile_id", parseInt(profileId))
    .eq("tender_id", parseInt(tenderId))
    .single();

  if (error) return NextResponse.json(null);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("eligibility_checks")
    .upsert(body, { onConflict: "profile_id,tender_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
```

Create `src/app/api/drafts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");
  const tenderId = searchParams.get("tender_id");

  if (!profileId || !tenderId) {
    return NextResponse.json({ error: "profile_id and tender_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bid_drafts")
    .select("*")
    .eq("profile_id", parseInt(profileId))
    .eq("tender_id", parseInt(tenderId))
    .single();

  if (error) return NextResponse.json(null);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("bid_drafts")
    .upsert({ ...body, updated_at: new Date().toISOString() }, { onConflict: "profile_id,tender_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
```

Create `src/app/api/forms/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");
  const tenderId = searchParams.get("tender_id");

  if (!profileId || !tenderId) {
    return NextResponse.json({ error: "profile_id and tender_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("form_checklists")
    .select("*")
    .eq("profile_id", parseInt(profileId))
    .eq("tender_id", parseInt(tenderId))
    .single();

  if (error) return NextResponse.json(null);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("form_checklists")
    .upsert(body, { onConflict: "profile_id,tender_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/
git commit -m "feat: add CRUD API routes for profile, tenders, eligibility, drafts, forms"
git push origin dev
```

---

### Task 4.3: Wire Frontend to API Routes

**Depends on:** Task 2.2+ (views must exist) + Task 4.2 (API routes ready)

- [ ] **Step 1: Connect Scout view to real tender data**

In `scout-view.tsx`, replace mock data with:

```typescript
useEffect(() => {
  fetch("/api/tenders?limit=50")
    .then((r) => r.json())
    .then(setTenders)
    .catch(console.error);
}, []);
```

- [ ] **Step 2: Connect Profile view to save profile**

Wire the profile completion to POST to `/api/profile`.

- [ ] **Step 3: Connect Analyst/Compliance/Writer to their respective APIs**

Each view fetches data on mount and saves via POST/PUT.

- [ ] **Step 4: Wire AI chat in each view**

Replace mock chat responses with the `useChat` hook from Task 3.2:

```typescript
const { messages, isLoading, sendMessage } = useChat("scout");
```

- [ ] **Step 5: End-to-end test**

Run through the full demo flow:
1. Profile agent → fill in company info → confirm
2. Scout → see matching tenders → click "Analyze"
3. Analyst → see RFP summary → click "Begin Compliance"
4. Compliance → see eligibility results → click "Begin Bid Draft"
5. Writer → see draft sections → edit and regenerate

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire all views to API routes and AI chat"
git push origin dev
```

---

## Dependency Graph

```
Person 1                Person 2                 Person 3                Person 4
────────                ────────                 ────────                ────────
1.1 Schema ──────────────────────────────────────────────────────────> 4.1 Supabase Client
    │                   2.1 Design System         3.1 AI Tools           │
    │                       │                         │                  │
1.2 Seed CSV                │                         │               4.2 CRUD Routes
    │                   2.2 Sidebar + Header      3.2 Chat Hook          │
    │                       │                         │                  │
1.3 Embeddings          2.3 Profile View              │                  │
    │                   2.4 Scout View                │                  │
1.4 Demo Profile        2.5 Analyst View              │               4.3 Wire Frontend
    │                   2.6 Compliance View            │              (needs 2.x + 4.2)
    └── support ──>     2.7 Writer View               │                  │
                            │                         │                  │
                            └─────────────── Integration Testing ────────┘
```

**Critical path:** Person 1's schema (Task 1.1) blocks Person 4's API routes. Embedding (Task 1.3) blocks AI search. Person 2 can work fully independently with mock data from hour 0.

---

## First 15 Minutes Agreement

Before splitting, the team agrees on:

1. **IDs are `bigint` (numbers), not UUIDs** — simpler, better performance per Supabase best practices
2. **Types are in `src/lib/types.ts`** — single source of truth, everyone imports from here
3. **Agent config in `src/lib/agents.ts`** — colors, names, categories
4. **API routes follow REST conventions:**
   - `GET /api/tenders` → list
   - `GET /api/tenders/[id]` → detail
   - `POST /api/profile` → create
   - `PUT /api/profile` → update
   - `POST /api/ai` → chat with AI agent
5. **CSS uses custom properties from `globals.css`** — reference by `var(--token-name)`
6. **Git workflow:** everyone works on `main`, pull before push, communicate before pushing

---

## Hackathon Timeline Summary

| Hour | Person 1 (Data) | Person 2 (Frontend) | Person 3 (AI) | Person 4 (API) |
|------|----------------|--------------------|--------------|--------------|
| 0-1 | Supabase + Schema | Next.js + Design System | Tool definitions + prompts | Supabase client |
| 1-2 | CSV seeder | Sidebar + Header + Chat | Tool handlers | CRUD routes |
| 2-3 | Embed pipeline | Profile View | AI API route + chat hook | CRUD routes cont. |
| 3-4 | Demo profile + support | Scout View | Test AI tools | Wire frontend |
| 4-5 | Support team | Analyst + Compliance | Prompt tuning | Wire frontend |
| 5-6 | Fix issues | Writer View + polish | End-to-end testing | Integration testing |
