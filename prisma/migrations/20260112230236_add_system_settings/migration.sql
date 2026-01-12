-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "matchDurationMin" INTEGER NOT NULL DEFAULT 15,
    "tableCount" INTEGER NOT NULL DEFAULT 1
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "type" TEXT NOT NULL DEFAULT 'ELIMINATION',
    "hostId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "hasReturnLeg" BOOLEAN NOT NULL DEFAULT false,
    "matchDurationMin" INTEGER NOT NULL DEFAULT 15,
    "tableCount" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Tournament_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tournament" ("createdAt", "date", "hasReturnLeg", "hostId", "id", "location", "name", "status", "type", "updatedAt") SELECT "createdAt", "date", "hasReturnLeg", "hostId", "id", "location", "name", "status", "type", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
