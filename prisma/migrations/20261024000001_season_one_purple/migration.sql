-- Saison 1 startet beim Update in Lila (wie bisher die App aussah, Farbe aus der Admin-Auswahl).
-- Nur, solange sie noch läuft und die alte Standardfarbe hat; eine abgeschlossene oder bewusst
-- umgefärbte Saison bleibt, wie sie ist.
UPDATE "Season" SET "accentColor" = '#7c3aed'
WHERE "id" = 'season-1' AND "endDate" IS NULL AND "accentColor" = '#006b50';
