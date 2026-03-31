-- 003_matching_improvements.sql
-- Adds region matching function, restores tender embeddings,
-- adds synonym + embedding columns to business_profiles

-- ============================================================
-- REGION MATCHING FUNCTION
-- ============================================================
-- Substring-matches province against regions_of_delivery array elements.
-- Also includes national-scope tenders (regions containing "Canada").
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

-- ============================================================
-- RESTORE TENDER EMBEDDINGS (dropped in migration 002)
-- ============================================================
CREATE TABLE IF NOT EXISTS tender_embeddings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tender_id bigint NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,
  UNIQUE (tender_id)
);

CREATE INDEX IF NOT EXISTS tender_embeddings_tender_id_idx
  ON tender_embeddings (tender_id);

-- ============================================================
-- EMBEDDING SIMILARITY FUNCTION
-- ============================================================
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

-- ============================================================
-- ADD COLUMNS TO BUSINESS_PROFILES
-- ============================================================
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS keyword_synonyms jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS embedding vector(1024);
