-- Deko am Logo zu Anlässen im Jahr; Standard: automatisch nach Datum
ALTER TABLE "SystemSettings" ADD COLUMN "logoDecoration" TEXT NOT NULL DEFAULT 'auto';
