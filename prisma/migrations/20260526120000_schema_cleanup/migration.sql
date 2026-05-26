-- ────────────────────────────────────────────────────────────────────────────
-- Schema cleanup pass:
--   1. Enforce Exam.categoryId NOT NULL (backfill ran in 20260525000000)
--   2. Add updatedAt to Subject + Topic for consistency with the rest of the
--      content models (Question, ExamCategory already have it)
-- ────────────────────────────────────────────────────────────────────────────

-- Safety net: backfill any Exam row whose categoryId is somehow still NULL
-- by matching its code prefix to the closest ExamCategory.code. This handles
-- the edge case where someone seeded a new exam without setting categoryId.
UPDATE "Exam" e
   SET "categoryId" = c.id
  FROM "ExamCategory" c
 WHERE e."categoryId" IS NULL
   AND (e."code" = c."code" OR e."code" LIKE c."code" || '-%');

-- 1. NOT NULL on categoryId
ALTER TABLE "Exam" ALTER COLUMN "categoryId" SET NOT NULL;

-- 2a. Subject.updatedAt — backfilled to createdAt so existing rows aren't null
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "Subject" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Subject" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Subject" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- 2b. Topic.updatedAt — same pattern
ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "Topic" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Topic" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Topic" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
