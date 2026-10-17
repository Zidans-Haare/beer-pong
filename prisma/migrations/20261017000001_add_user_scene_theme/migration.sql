-- Hintergrund der Szenen pro Nutzer; bestehende Nutzer bekommen das Stadion
ALTER TABLE "User" ADD COLUMN "sceneTheme" TEXT NOT NULL DEFAULT 'stadium';
