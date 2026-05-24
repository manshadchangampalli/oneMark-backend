-- CreateTable: ExamCategory
CREATE TABLE "ExamCategory" (
    "id"          UUID         NOT NULL,
    "code"        TEXT         NOT NULL,
    "label"       TEXT         NOT NULL,
    "description" TEXT,
    "colorHex"    TEXT,
    "iconKey"     TEXT,
    "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
    "isActive"    BOOLEAN      NOT NULL DEFAULT true,
    "archivedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamCategory_code_key"       ON "ExamCategory"("code");
CREATE INDEX        "ExamCategory_code_idx"       ON "ExamCategory"("code");
CREATE INDEX        "ExamCategory_sortOrder_idx"  ON "ExamCategory"("sortOrder");

-- AlterTable: add nullable categoryId to Exam
ALTER TABLE "Exam" ADD COLUMN "categoryId" UUID;
CREATE INDEX "Exam_categoryId_idx" ON "Exam"("categoryId");

-- Seed default categories matching every existing Exam.code so backfill is unambiguous.
-- gen_random_uuid() requires pgcrypto; Neon has it on by default.
INSERT INTO "ExamCategory" ("id", "code", "label", "description", "colorHex", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'psc',    'Kerala PSC', 'Kerala Public Service Commission',           '#D4541A', 0, true,  NOW(), NOW()),
  (gen_random_uuid(), 'jee',    'JEE',        'Joint Entrance Examination (Main + Advanced)','#3B82F6', 1, false, NOW(), NOW()),
  (gen_random_uuid(), 'neet',   'NEET',       'National medical entrance',                  '#10B981', 2, false, NOW(), NOW()),
  (gen_random_uuid(), 'cuet',   'CUET',       'Central Universities Entrance Test',         '#8B5CF6', 3, false, NOW(), NOW()),
  (gen_random_uuid(), 'boards', 'Boards',     'CBSE / ICSE / State boards',                 '#6B7280', 4, false, NOW(), NOW()),
  (gen_random_uuid(), 'gate',   'GATE',       'Engineering postgraduate entrance',          '#F59E0B', 5, false, NOW(), NOW()),
  (gen_random_uuid(), 'cat',    'CAT',        'Management entrance',                        '#EC4899', 6, false, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- Backfill: link every existing Exam to its matching category by code
UPDATE "Exam" e
   SET "categoryId" = c.id
  FROM "ExamCategory" c
 WHERE e."categoryId" IS NULL
   AND e."code" = c."code";

-- FK constraint (nullable for now; we can NOT NULL once we're sure nothing is unlinked)
ALTER TABLE "Exam"
  ADD CONSTRAINT "Exam_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ExamCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
