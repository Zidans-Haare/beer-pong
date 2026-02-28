-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notifyNewTournaments" BOOLEAN NOT NULL DEFAULT true,
    "notifyUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notifyLiveTicker" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_User" ("email", "emailVerified", "id", "image", "name", "notifyLiveTicker", "notifyNewTournaments", "notifyUpdates", "password") SELECT "email", "emailVerified", "id", "image", "name", "notifyLiveTicker", "notifyNewTournaments", "notifyUpdates", "password" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
