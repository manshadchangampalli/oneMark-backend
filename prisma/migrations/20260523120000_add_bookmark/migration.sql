-- CreateTable
CREATE TABLE "Bookmark" (
    "userId"     UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("userId", "questionId")
);

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Bookmark"
  ADD CONSTRAINT "Bookmark_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "User"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Bookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
