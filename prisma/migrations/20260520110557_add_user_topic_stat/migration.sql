-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "questionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserTopicStat" (
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "attempted" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTopicStat_pkey" PRIMARY KEY ("userId","topicId")
);

-- CreateIndex
CREATE INDEX "UserTopicStat_userId_lastAttemptedAt_idx" ON "UserTopicStat"("userId", "lastAttemptedAt" DESC);

-- AddForeignKey
ALTER TABLE "UserTopicStat" ADD CONSTRAINT "UserTopicStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicStat" ADD CONSTRAINT "UserTopicStat_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
