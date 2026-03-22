-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "matchDurationMin" INTEGER NOT NULL DEFAULT 15,
    "tableCount" INTEGER NOT NULL DEFAULT 1,
    "rulesText" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_SystemSettings" ("id", "matchDurationMin", "tableCount") SELECT "id", "matchDurationMin", "tableCount" FROM "SystemSettings";
DROP TABLE "SystemSettings";
ALTER TABLE "new_SystemSettings" RENAME TO "SystemSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
