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
