-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BringItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BringItem_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BringItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BringItem" ("category", "createdAt", "id", "tournamentId", "userId", "userName") SELECT "category", "createdAt", "id", "tournamentId", "userId", "userName" FROM "BringItem";
DROP TABLE "BringItem";
ALTER TABLE "new_BringItem" RENAME TO "BringItem";
CREATE UNIQUE INDEX "BringItem_tournamentId_category_userId_key" ON "BringItem"("tournamentId", "category", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
