-- Add `tags` column on Question for stage/year/source classification.
-- Defaults to empty array so the column is non-NULL and existing rows are fine.
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- GIN index makes `tags @> ARRAY['stage:prelims']` and friends an
-- indexed lookup instead of a full table scan. Crucial once we have
-- thousands of questions across multiple exam categories.
CREATE INDEX IF NOT EXISTS "Question_tags_idx" ON "Question" USING GIN ("tags");
