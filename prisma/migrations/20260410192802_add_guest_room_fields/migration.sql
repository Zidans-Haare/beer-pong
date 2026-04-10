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
    "shortCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "hasReturnLeg" BOOLEAN NOT NULL DEFAULT false,
    "matchDurationMin" INTEGER NOT NULL DEFAULT 15,
    "tableCount" INTEGER NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL DEFAULT 'SOLO',
    "isRanked" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "offersGuestRoom" BOOLEAN NOT NULL DEFAULT false,
    "guestRoomTitle" TEXT,
    "guestRoomCapacity" INTEGER NOT NULL DEFAULT 0,
    "guestRoomDescription" TEXT,
    "guestRoomImage" TEXT,
    "offersBreakfast" BOOLEAN NOT NULL DEFAULT false,
    "offersHalfBoard" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Tournament_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tournament" ("createdAt", "date", "guestRoomCapacity", "guestRoomDescription", "guestRoomImage", "hasReturnLeg", "hostId", "id", "image", "isRanked", "location", "matchDurationMin", "mode", "name", "offersGuestRoom", "shortCode", "status", "tableCount", "type", "updatedAt") SELECT "createdAt", "date", "guestRoomCapacity", "guestRoomDescription", "guestRoomImage", "hasReturnLeg", "hostId", "id", "image", "isRanked", "location", "matchDurationMin", "mode", "name", "offersGuestRoom", "shortCode", "status", "tableCount", "type", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE UNIQUE INDEX "Tournament_shortCode_key" ON "Tournament"("shortCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
