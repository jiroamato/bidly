-- Bidly Database Schema (consolidated)
-- Run this single migration in your Supabase SQL Editor.

-- Enable pgvector (required for future embedding features)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================
CREATE TABLE business_profiles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_name text NOT NULL,
  naics_codes text[] NOT NULL DEFAULT '{}',
  location text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  capabilities text NOT NULL DEFAULT '',
  keywords text[] NOT NULL DEFAULT '{}',
  insurance_amount text NOT NULL DEFAULT '',
  bonding_limit integer,
  certifications text[] NOT NULL DEFAULT '{}',
  years_in_business integer,
  past_gov_experience text NOT NULL DEFAULT '',
  pbn text NOT NULL DEFAULT '',
  is_canadian boolean,
  security_clearance text NOT NULL DEFAULT '',
  project_size_min integer,
  project_size_max integer,
  keyword_synonyms jsonb NOT NULL DEFAULT '{}',
  embedding vector(1024),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TENDERS
-- ============================================================
CREATE TABLE tenders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference_number text UNIQUE NOT NULL,
  solicitation_number text,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  publication_date timestamptz,
  closing_date timestamptz,
  status text NOT NULL DEFAULT '',
  procurement_category text NOT NULL DEFAULT '',
  notice_type text NOT NULL DEFAULT '',
  procurement_method text NOT NULL DEFAULT '',
  selection_criteria text NOT NULL DEFAULT '',
  gsin_codes text[] NOT NULL DEFAULT '{}',
  unspsc_codes text[] NOT NULL DEFAULT '{}',
  regions_of_opportunity text[] NOT NULL DEFAULT '{}',
  regions_of_delivery text[] NOT NULL DEFAULT '{}',
  trade_agreements text[] NOT NULL DEFAULT '{}',
  contracting_entity text NOT NULL DEFAULT '',
  notice_url text NOT NULL DEFAULT '',
  attachment_urls text[] NOT NULL DEFAULT '{}',
  raw_csv_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenders_closing_date_idx ON tenders (closing_date);
CREATE INDEX tenders_status_idx ON tenders (status);
CREATE INDEX tenders_procurement_category_idx ON tenders (procurement_category);

-- ============================================================
-- TENDER EMBEDDINGS (for future vector search)
-- ============================================================
CREATE TABLE tender_embeddings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,
  UNIQUE (tender_id)
);

CREATE INDEX tender_embeddings_tender_id_idx ON tender_embeddings (tender_id);

-- ============================================================
-- TENDER SELECTIONS
-- ============================================================
CREATE TABLE tender_selections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  match_score integer NOT NULL DEFAULT 0,
  matched_keywords text[] NOT NULL DEFAULT '{}',
  match_reasoning text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tender_id)
);

CREATE INDEX tender_selections_profile_id_idx ON tender_selections (profile_id);
CREATE INDEX tender_selections_tender_id_idx ON tender_selections (tender_id);

-- ============================================================
-- TENDER ANALYSES
-- ============================================================
CREATE TABLE tender_analyses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  analysis jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tender_id)
);

CREATE INDEX tender_analyses_profile_id_idx ON tender_analyses (profile_id);
CREATE INDEX tender_analyses_tender_id_idx ON tender_analyses (tender_id);

-- ============================================================
-- ELIGIBILITY CHECKS
-- ============================================================
CREATE TABLE eligibility_checks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  responses jsonb NOT NULL DEFAULT '{}',
  result text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  documentation_checklist jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tender_id)
);

CREATE INDEX eligibility_checks_profile_id_idx ON eligibility_checks (profile_id);
CREATE INDEX eligibility_checks_tender_id_idx ON eligibility_checks (tender_id);

-- ============================================================
-- BID DRAFTS
-- ============================================================
CREATE TABLE bid_drafts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  sections jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tender_id)
);

CREATE INDEX bid_drafts_profile_id_idx ON bid_drafts (profile_id);
CREATE INDEX bid_drafts_tender_id_idx ON bid_drafts (tender_id);

-- ============================================================
-- FORM CHECKLISTS
-- ============================================================
CREATE TABLE form_checklists (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  forms jsonb NOT NULL DEFAULT '[]',
  progress_pct integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tender_id)
);

CREATE INDEX form_checklists_profile_id_idx ON form_checklists (profile_id);
CREATE INDEX form_checklists_tender_id_idx ON form_checklists (tender_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Region matching: returns tenders matching a province or national scope
CREATE OR REPLACE FUNCTION tenders_by_region(target_province text)
RETURNS SETOF tenders
LANGUAGE sql STABLE
AS $$
  SELECT * FROM tenders
  WHERE EXISTS (
    SELECT 1 FROM unnest(regions_of_delivery) AS region
    WHERE region ILIKE '%' || target_province || '%'
  )
  OR EXISTS (
    SELECT 1 FROM unnest(regions_of_delivery) AS region
    WHERE region ILIKE '%Canada%'
  )
  ORDER BY closing_date ASC;
$$;

-- Embedding similarity search (for future vector search)
CREATE OR REPLACE FUNCTION match_tenders_by_embedding(
  query_embedding vector(1024),
  match_count int DEFAULT 200
)
RETURNS TABLE (tender_id bigint, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT te.tender_id, 1 - (te.embedding <=> query_embedding) AS similarity
  FROM tender_embeddings te
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
$$;
