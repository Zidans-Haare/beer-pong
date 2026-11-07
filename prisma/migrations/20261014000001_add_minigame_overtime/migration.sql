-- Verlängerung eines Duells als eigener Eintrag: Verweis auf das ursprüngliche Duell und Nummer der Verlängerung
ALTER TABLE "MiniGame" ADD COLUMN "parentId" TEXT;
ALTER TABLE "MiniGame" ADD COLUMN "stage" INTEGER NOT NULL DEFAULT 0;
