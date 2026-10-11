-- CreateTable
CREATE TABLE "MiniGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "difficulty" TEXT,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT,
    "starter" TEXT,
    "challengerHand" TEXT,
    "opponentHand" TEXT,
    "challengerRounds" INTEGER,
    "opponentRounds" INTEGER,
    "challengerHits" INTEGER,
    "opponentHits" INTEGER,
    "winner" TEXT,
    "nakedMile" TEXT,
    "replay" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "MiniGame_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MiniGame_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MiniGame_challengerId_idx" ON "MiniGame"("challengerId");

-- CreateIndex
CREATE INDEX "MiniGame_opponentId_status_idx" ON "MiniGame"("opponentId", "status");
