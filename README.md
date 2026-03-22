# Bidly — AI-Powered Procurement Assistant

Bidly helps Canadian businesses find, understand, and bid on government tenders. Five specialized AI agents guide you through the entire procurement workflow — from company profiling to bid submission.

## How It Works

Bidly uses a multi-agent pipeline where each agent handles one stage of the procurement process:

| Agent | Stage | What It Does |
|-------|-------|-------------|
| **Profile** | Setup | Collects your company info (NAICS codes, location, capabilities) through conversational Q&A |
| **Scout** | Research | Searches 500+ government tenders using vector similarity matching and filters |
| **Analyst** | Research | Breaks down RFPs into plain-language summaries: scope, deadlines, forms, evaluation criteria, risks |
| **Compliance** | Execute | Checks eligibility against Buy Canadian policy, certifications, insurance, bonding, and mandatory steps |
| **Writer** | Execute | Drafts bid proposal sections and calculates pricing with correct GST/HST/PST by province |

Agents unlock sequentially — completing one activates the next.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** TailwindCSS 4 + shadcn/ui
- **AI:** Claude Sonnet (Anthropic API) with tool use for agentic workflows
- **Search:** Voyage AI embeddings (`voyage-3-lite`) + pgvector cosine similarity
- **Database:** Supabase (Postgres + pgvector)
- **Data:** Canadian government open-data tender notices (2025–2026)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with pgvector enabled
- API keys for Anthropic and Voyage AI

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
VOYAGE_API_KEY=your_voyage_key
```

### 3. Set up the database

Run the migration in your Supabase SQL Editor:

```bash
# File: supabase/migrations/001_initial_schema.sql
```

This creates all tables, indexes, and the `match_tenders` vector search function.

### 4. Seed tender data

```bash
npx tsx scripts/seed-tenders.ts
npx tsx scripts/embed-tenders.ts
```

The seed script imports up to 500 tenders from the included CSV. The embed script generates vector embeddings for semantic search.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using Bidly.

## Project Structure

```
src/
├── app/api/          — API routes (ai, tenders, profile, eligibility, drafts, forms)
├── components/       — UI components (sidebar, header, chat input, agent views)
├── hooks/            — React hooks (agent state machine, chat messaging)
└── lib/              — Core logic (agent configs, AI prompts/tools, Supabase, Voyage)
scripts/              — Data pipeline (CSV seeding + vector embedding)
supabase/migrations/  — Database schema
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run tests (Vitest) |
| `npx tsx scripts/seed-tenders.ts` | Import tenders from CSV into Supabase |
| `npx tsx scripts/embed-tenders.ts` | Generate vector embeddings for tender search |

## Team

Built by **jiroamato**, **claudia-liauw**, **vytphan**, and **will-chh** at a 2026 hackathon.
