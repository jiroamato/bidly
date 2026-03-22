# Bidly Codebase Research — Full Overview

**Date:** 2026-03-22

## Summary

Bidly is an AI-powered procurement assistant that helps Canadian businesses find, understand, and bid on government tenders. Built with Next.js 16, React 19, TailwindCSS, Supabase (Postgres + pgvector), and the Anthropic Claude API, the app uses a multi-agent architecture where five specialized AI agents guide the user through a linear workflow: profile creation, tender discovery, RFP analysis, compliance checking, and bid writing. Real government tender data is sourced from a Canadian government open-data CSV and made searchable via Voyage AI vector embeddings stored in Supabase.

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.1 (App Router) |
| UI | React 19.2.4, TailwindCSS 4, shadcn/ui, Lucide icons |
| Typography | IBM Plex Sans, IBM Plex Mono, DM Serif Display |
| AI Backend | Anthropic Claude API (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk` |
| Embeddings | Voyage AI (`voyage-3-lite`, 512-dim vectors) |
| Database | Supabase (Postgres with pgvector extension) |
| Testing | Vitest 4 + Testing Library |

### Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/route.ts          — Claude chat endpoint with tool-use loop
│   │   ├── drafts/route.ts      — CRUD for bid drafts
│   │   ├── eligibility/route.ts — CRUD for eligibility checks
│   │   ├── forms/route.ts       — CRUD for form checklists
│   │   ├── profile/route.ts     — CRUD for business profiles
│   │   ├── tenders/route.ts     — List tenders (with category filter)
│   │   └── tenders/[id]/route.ts — Get single tender by ID
│   ├── globals.css              — Design tokens + Tailwind config
│   ├── layout.tsx               — Root layout with font setup
│   └── page.tsx                 — Main SPA entry (sidebar + agent views)
├── components/
│   ├── chat-input.tsx           — Reusable chat input bar
│   ├── main-header.tsx          — Top breadcrumb header
│   ├── sidebar.tsx              — Left nav with agent list + profile footer
│   └── views/
│       ├── profile-view.tsx     — Profile builder (step-by-step Q&A + demo mode)
│       ├── scout-view.tsx       — Tender search results with filters & stats
│       ├── analyst-view.tsx     — RFP analysis dashboard (mock data)
│       ├── compliance-view.tsx  — Eligibility checklist (mock data)
│       └── writer-view.tsx      — Bid section editor with pricing table
├── hooks/
│   ├── use-agent.ts             — Global agent state (active agent, statuses, profile, tender)
│   └── use-chat.ts              — Per-agent chat messaging via /api/ai
├── lib/
│   ├── agents.ts                — Agent configs (id, name, color, category)
│   ├── ai/
│   │   ├── prompts.ts           — System prompts per agent + tool permissions
│   │   ├── tools.ts             — Anthropic tool definitions (9 tools)
│   │   └── tool-handlers.ts     — Server-side tool execution (Supabase + Voyage)
│   ├── seed-utils.ts            — CSV parsing helpers for tender data
│   ├── supabase.ts              — Browser + server Supabase clients
│   ├── types.ts                 — TypeScript interfaces for all entities
│   ├── utils.ts                 — Utility (cn helper)
│   └── voyage.ts                — Voyage AI embedding client
├── __tests__/                   — Unit tests (agents, components, use-agent hook)
scripts/
├── seed-tenders.ts              — Imports up to 500 tenders from CSV into Supabase
└── embed-tenders.ts             — Generates Voyage embeddings for all tenders
supabase/
└── migrations/001_initial_schema.sql — Full schema: 5 tables + vector search RPC
```

## Multi-Agent Workflow

The app defines five agents that run in a fixed linear pipeline:

| # | Agent | Category | Purpose | Tools |
|---|-------|----------|---------|-------|
| 1 | **Profile** | Setup | Collects company info through Q&A chat | `getCompanyProfile`, `saveProgress` |
| 2 | **Scout** | Research | Searches and ranks matching tenders | `searchTenders`, `getCompanyProfile` |
| 3 | **Analyst** | Research | Analyzes RFP: scope, deadlines, forms, criteria, risks | `getTenderDetails`, `summarizeTender`, `getFormChecklist` |
| 4 | **Compliance** | Execute | Checks eligibility: Buy Canadian, certs, insurance, bonds | `checkEligibility`, `getCompanyProfile` |
| 5 | **Writer** | Execute | Drafts bid sections + calculates pricing with GST/HST | `draftBidSection`, `explainForm`, `calculatePricing`, `saveProgress` |

Agents unlock sequentially — completing one activates the next. The `use-agent.ts` hook manages this state machine on the client side (`locked` → `active` → `completed`).

## AI Integration

- **Chat endpoint** (`src/app/api/ai/route.ts`): Receives `agentId`, `messages`, and optional `profileContext`. Constructs agent-specific system prompts, filters the tool set per agent, and runs a tool-use loop (max 10 iterations) against Claude Sonnet.
- **Tool definitions** (`src/lib/ai/tools.ts`): 9 Anthropic-format tools — `searchTenders`, `getTenderDetails`, `summarizeTender`, `checkEligibility`, `getFormChecklist`, `explainForm`, `draftBidSection`, `calculatePricing`, `getCompanyProfile`, `saveProgress`.
- **Tool handlers** (`src/lib/ai/tool-handlers.ts`): Server-side execution. `searchTenders` supports both vector similarity (via Voyage embeddings + `match_tenders` RPC) and filter-based queries. `calculatePricing` computes GST/HST/PST for all Canadian provinces. Some tools (eligibility, drafting, form explanation) delegate back to the AI with a hint note.

## Database Schema

Five Supabase tables (see `supabase/migrations/001_initial_schema.sql`):

1. **`business_profiles`** — company name, NAICS codes, location, province, capabilities, keywords, 512-dim embedding
2. **`tenders`** — full tender data (reference number, title, description, dates, categories, regions, trade agreements, contracting entity, URLs, raw CSV JSON). Indexed on closing_date, status, procurement_category.
3. **`tender_embeddings`** — vector(512) embeddings per tender with chunk text. IVFFlat index for cosine similarity search.
4. **`eligibility_checks`** — per profile+tender eligibility assessment (pass/fail/conditional, explanation, documentation checklist). Unique on (profile_id, tender_id).
5. **`bid_drafts`** — per profile+tender bid sections (exec summary, technical, team, project mgmt, safety, pricing). Unique on (profile_id, tender_id).
6. **`form_checklists`** — per profile+tender required forms tracking with progress percentage.

Vector search RPC `match_tenders(query_embedding, match_count)` returns tender IDs ranked by cosine similarity.

## Data Pipeline

1. **CSV Source:** `2025-2026-TenderNotice-AvisAppelOffres.csv` — Canadian government open data (bilingual columns).
2. **Seed script** (`scripts/seed-tenders.ts`): Parses CSV, maps bilingual columns to English fields, upserts up to 500 tenders into Supabase.
3. **Embedding script** (`scripts/embed-tenders.ts`): Generates Voyage `voyage-3-lite` embeddings for `title + description`, stores in `tender_embeddings`, creates IVFFlat index.

## Frontend Design

- **Single-page app** with sidebar navigation and full-height agent views.
- **Design system** uses custom CSS variables (`--agent-profile`, `--agent-scout`, etc.) with warm neutral tones.
- **Profile view** has a guided step-by-step Q&A with province selection buttons and a "Load Demo" mode that auto-fills with "Maple Facility Services Inc." (a Saskatchewan janitorial company).
- **Scout view** displays tender cards with match scores, filter tabs (All/High Match/Closing Soon/Ontario/Federal), and summary stats.
- **Analyst view** shows a 2x2 card grid: scope, deadlines, mandatory forms, evaluation criteria, plus a disqualification risks panel. Currently uses mock data.
- **Compliance view** shows a structured eligibility checklist grouped by category (Buy Canadian, Qualifications, Mandatory Steps, Documentation) with pass/fail/warn status icons. Currently uses mock data.
- **Writer view** has a split layout: section sidebar (Bid Sections / Forms & Pricing / Export) + main editor area with AI-drafted content blocks and a pricing table with HST calculations. Currently uses mock data.

## Environment Variables

Required (from `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`

## Team

Team members (from `team.txt`): jiroamato, claudia-liauw, vytphan, will-chh
