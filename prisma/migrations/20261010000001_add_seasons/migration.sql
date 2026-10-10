-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "accentColor" TEXT NOT NULL DEFAULT '#006b50',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Saison 1 umfasst alle bisherigen Turniere und läuft, bis sie im Admin beendet wird
INSERT INTO "Season" ("id", "name", "startDate", "endDate", "accentColor")
VALUES ('season-1', 'Saison 1', '2000-01-01T00:00:00.000Z', NULL, '#006b50');
