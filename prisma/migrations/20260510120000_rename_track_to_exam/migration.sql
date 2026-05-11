-- Drop old partial unique index
DROP INDEX IF EXISTS "UserTrack_userId_isPrimary_unique";

-- Drop foreign keys
ALTER TABLE "UserTrack" DROP CONSTRAINT "UserTrack_userId_fkey";
ALTER TABLE "UserTrack" DROP CONSTRAINT "UserTrack_trackId_fkey";

-- Rename tables
ALTER TABLE "Track" RENAME TO "Exam";
ALTER TABLE "UserTrack" RENAME TO "UserExam";

-- Rename column
ALTER TABLE "UserExam" RENAME COLUMN "trackId" TO "examId";

-- Rename constraints and indexes
ALTER TABLE "Exam" RENAME CONSTRAINT "Track_pkey" TO "Exam_pkey";
ALTER INDEX "Track_code_key" RENAME TO "Exam_code_key";
ALTER TABLE "UserExam" RENAME CONSTRAINT "UserTrack_pkey" TO "UserExam_pkey";
ALTER INDEX "UserTrack_userId_idx" RENAME TO "UserExam_userId_idx";
ALTER INDEX "UserTrack_trackId_idx" RENAME TO "UserExam_examId_idx";

-- Re-add foreign keys with new names
ALTER TABLE "UserExam" ADD CONSTRAINT "UserExam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserExam" ADD CONSTRAINT "UserExam_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Re-create partial unique index
CREATE UNIQUE INDEX "UserExam_userId_isPrimary_unique" ON "UserExam"("userId") WHERE "isPrimary" = true;

-- Fix SubjectExam FK to point to renamed Exam table
ALTER TABLE "SubjectExam" DROP CONSTRAINT "SubjectExam_examId_fkey";
ALTER TABLE "SubjectExam" ADD CONSTRAINT "SubjectExam_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
