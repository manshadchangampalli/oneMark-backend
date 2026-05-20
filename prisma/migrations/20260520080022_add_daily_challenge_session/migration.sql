-- CreateTable
CREATE TABLE "DailyChallengeSession" (
    "userId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallengeSession_pkey" PRIMARY KEY ("userId","challengeId")
);

-- AddForeignKey
ALTER TABLE "DailyChallengeSession" ADD CONSTRAINT "DailyChallengeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeSession" ADD CONSTRAINT "DailyChallengeSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
