-- ────────────────────────────────────────────────────────────────────────────
-- Split the single "Kerala PSC" exam into per-post exams (LDC, LGS, VEO, etc.)
-- and add a `tier` column so we can group same-syllabus posts (10th Level,
-- +2 Level, Degree Level). Backwards compatible: existing rows that pointed
-- at "psc" become "psc-ldc" (most common entry-level post).
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Add the tier column to Exam
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "tier" TEXT;
CREATE INDEX IF NOT EXISTS "Exam_categoryId_tier_idx" ON "Exam"("categoryId", "tier");

-- 2. Re-purpose the existing single "psc" Exam row as "psc-ldc"
--    (keeps all UserExam / QuestionExam / SubjectExam relations intact since
--    they reference by id, not by code)
UPDATE "Exam"
   SET "code"  = 'psc-ldc',
       "label" = 'LDC',
       "description" = 'Lower Division Clerk (10th Level common prelim)',
       "tier"  = '10th Level'
 WHERE "code"  = 'psc';

-- 3. Insert the remaining PSC posts, each linked to the PSC ExamCategory
INSERT INTO "Exam" ("id", "code", "label", "description", "categoryId", "tier", "isActive", "createdAt")
SELECT
  gen_random_uuid(),
  v.code,
  v.label,
  v.description,
  c.id,
  v.tier,
  true,
  NOW()
FROM (VALUES
  -- 10th Level
  ('psc-lgs',          'LGS',                       'Last Grade Servant',                         '10th Level'),
  ('psc-veo',          'Village Extension Officer', 'VEO Gr. II — rural development field officer','10th Level'),
  ('psc-police',       'Police Constable',          'Civil Police Constable (Men & Women)',       '10th Level'),
  ('psc-fireman',      'Fireman',                   'Fireman / Fire & Rescue Officer Tr.',        '10th Level'),
  -- +2 Level
  ('psc-plus-two',     'Plus Two Level Prelims',    'Common +2 Level Preliminary Examination',    '+2 Level'),
  -- Degree Level
  ('psc-ua',           'University Assistant',      'Universities / non-secretariat clerical',    'Degree Level'),
  ('psc-cpo',          'Civil Police Officer',      'Sub-Inspector / Civil Police Officer (Trainee)','Degree Level'),
  ('psc-secretariat',  'Secretariat Assistant',     'Secretariat / PSC office / similar',         'Degree Level'),
  ('psc-si',           'Sub Inspector',             'Sub Inspector of Police (Men)',              'Degree Level')
) AS v("code", "label", "description", "tier")
CROSS JOIN "ExamCategory" c
WHERE c."code" = 'psc'
ON CONFLICT ("code") DO NOTHING;

-- 4. Migrate legacy User.targetExam = 'psc' → 'psc-ldc' so the auth-store
--    string stays in sync with the renamed primary exam code.
UPDATE "User" SET "targetExam" = 'psc-ldc' WHERE "targetExam" = 'psc';
