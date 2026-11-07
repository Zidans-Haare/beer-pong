import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// Prüft die Migrationen so, wie Prod und Testserver sie erleben
const root = path.resolve(__dirname, '../../prisma/migrations');
const migrations = fs.readdirSync(root).filter(n => /^\d+_/.test(n)).sort();
const run = (db: Database.Database, names: string[]) => { for (const name of names) db.exec(fs.readFileSync(path.join(root, name, 'migration.sql'), 'utf8')); };
const LILA = '#7c3aed';

describe('Saisonfarbe beim Update', () => {
    it('Prod: Saison 1 entsteht beim Update und ist lila, wie die Farbe aus der Admin-Auswahl', () => {
        const db = new Database(':memory:');
        run(db, migrations);
        expect(db.prepare("select accentColor, endDate from Season where id = 'season-1'").get()).toEqual({ accentColor: LILA, endDate: null });
        db.close();
    });

    it('Lila gehört zur Farbauswahl im Admin', () => {
        const manager = fs.readFileSync(path.resolve(__dirname, '../app/admin/seasons/season-manager.tsx'), 'utf8');
        expect(manager).toContain(`'${LILA}'`);
    });

    it('Testserver: eine schon abgeschlossene Saison 1 bleibt unverändert', () => {
        const db = new Database(':memory:');
        const last = migrations.indexOf('20261024000001_season_one_purple');
        run(db, migrations.slice(0, last));
        db.exec("update Season set endDate = '2026-10-24T19:47:38.655+00:00' where id = 'season-1'");
        run(db, migrations.slice(last));
        expect(db.prepare("select accentColor from Season where id = 'season-1'").get()).toEqual({ accentColor: '#006b50' });
        db.close();
    });
});
