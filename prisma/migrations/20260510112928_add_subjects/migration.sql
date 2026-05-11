-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectExam" (
    "subjectId" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubjectExam_pkey" PRIMARY KEY ("subjectId","examId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE INDEX "SubjectExam_examId_idx" ON "SubjectExam"("examId");

-- AddForeignKey
ALTER TABLE "SubjectExam" ADD CONSTRAINT "SubjectExam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectExam" ADD CONSTRAINT "SubjectExam_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
