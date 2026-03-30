-- Working MVP schema changes
-- Adds structured profile columns, creates tender_selections and tender_analyses,
-- removes embedding infrastructure (Voyage removed)

-- ============================================================
-- ADD COLUMNS TO BUSINESS_PROFILES
-- ============================================================
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS insurance_amount text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bonding_limit integer,
  ADD COLUMN IF NOT EXISTS certifications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_in_business integer,
  ADD COLUMN IF NOT EXISTS past_gov_experience text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pbn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_canadian boolean,
  ADD COLUMN IF NOT EXISTS security_clearance text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_size_min integer,
  ADD COLUMN IF NOT EXISTS project_size_max integer;

-- Remove the embedding column (Voyage removed)
ALTER TABLE business_profiles
  DROP COLUMN IF EXISTS embedding;

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
-- DROP EMBEDDING INFRASTRUCTURE
-- ============================================================
-- Drop the vector search RPC function
DROP FUNCTION IF EXISTS match_tenders(vector(512), int);

-- Drop the tender_embeddings table
DROP TABLE IF EXISTS tender_embeddings;
