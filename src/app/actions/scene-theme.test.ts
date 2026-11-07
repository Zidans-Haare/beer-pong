import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

// Echte Datenbank in einer Wegwerf-Datei, aufgebaut aus den Migrationen des Projekts
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-theme-'));
const file = path.join(dir, 'test.db');
process.env.DATABASE_URL = `file:${file}`;

let currentUser: string | null = 'user-nick';
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: async () => (currentUser ? { user: { id: currentUser } } : null) }));

beforeAll(() => {
    const db = new Database(file);
    const root = path.resolve(__dirname, '../../../prisma/migrations');
    for (const name of fs.readdirSync(root).filter(n => /^\d+_/.test(n)).sort()) db.exec(fs.readFileSync(path.join(root, name, 'migration.sql'), 'utf8'));
    db.prepare("insert into User (id, name, email, status) values ('user-nick', 'Nick', 'nick@test', 'ACTIVE')").run();
    db.close();
});

describe('Hintergrund wählen', () => {
    it('bestehende Nutzer haben das Stadion, die Wahl wird gespeichert und geladen', async () => {
        const { setSceneTheme } = await import('./scene-theme');
        const { getSceneTheme } = await import('@/lib/scene-theme-server');
        expect(await getSceneTheme('user-nick')).toBe('stadium');
        expect(await setSceneTheme('beach')).toEqual({ success: true });
        expect(await getSceneTheme('user-nick')).toBe('beach');
    });

    it('lehnt Unbekanntes und Fremde ab; ohne Anmeldung gilt das Stadion', async () => {
        const { setSceneTheme } = await import('./scene-theme');
        const { getSceneTheme } = await import('@/lib/scene-theme-server');
        expect((await setSceneTheme('mond')).success).toBe(false);
        currentUser = null;
        expect((await setSceneTheme('club')).success).toBe(false);
        expect(await getSceneTheme()).toBe('stadium');
        currentUser = 'user-nick';
    });
});
