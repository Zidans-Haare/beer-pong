import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

// Echte Datenbank in einer Wegwerf-Datei, aufgebaut aus den Migrationen des Projekts
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-'));
const file = path.join(dir, 'test.db');
process.env.DATABASE_URL = `file:${file}`;

let currentUser: string | null = 'user-nick';
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/auth', () => ({ auth: async () => (currentUser ? { user: { id: currentUser } } : null) }));

const spec = { skin: 3, hairStyle: 'bun', hairColor: 2, shirt: 5, pattern: 'dots', accessories: ['beerhat', 'glasses', 'scarf'], height: 0, build: 2 };

beforeAll(() => {
    const db = new Database(file);
    const root = path.resolve(__dirname, '../../../prisma/migrations');
    for (const name of fs.readdirSync(root).filter(n => /^\d+_/.test(n)).sort()) db.exec(fs.readFileSync(path.join(root, name, 'migration.sql'), 'utf8'));
    const user = db.prepare("insert into User (id, name, email, status) values (?, ?, ?, 'ACTIVE')");
    const player = db.prepare("insert into Player (id, name, userId, isGuest, updatedAt) values (?, ?, ?, 0, CURRENT_TIMESTAMP)");
    user.run('user-nick', 'Nick', 'nick@test'); player.run('p-nick', 'Nick', 'user-nick');
    user.run('user-moonzy', 'Moonzy', 'moonzy@test'); player.run('p-moonzy', 'Moonzy', 'user-moonzy');
    db.close();
});

describe('Figur speichern', () => {
    it('speichert die eigene Figur und liefert sie für alle', async () => {
        const { saveFigure } = await import('./figure');
        const { loadFigureMap } = await import('@/lib/figure-server');
        currentUser = 'user-nick';
        expect(await saveFigure(spec)).toEqual({ success: true });
        const map = await loadFigureMap();
        expect(map.nick).toEqual(spec);
    });

    it('lehnt ungültige Figuren und Fremde ab', async () => {
        const { saveFigure } = await import('./figure');
        currentUser = 'user-nick';
        expect((await saveFigure({ ...spec, accessories: ['hut'] })).success).toBe(false);
        expect((await saveFigure('quatsch')).success).toBe(false);
        currentUser = null;
        expect((await saveFigure(spec)).success).toBe(false);
    });

    it('Moonzys Hautfarbe bleibt fest', async () => {
        const { saveFigure } = await import('./figure');
        const { loadFigureMap } = await import('@/lib/figure-server');
        const { MOONZY_SKIN } = await import('@/lib/figure');
        currentUser = 'user-moonzy';
        expect((await saveFigure({ ...spec, skin: 0 })).success).toBe(true);
        expect((await loadFigureMap()).moonzy.skin).toBe(MOONZY_SKIN);
    });

    it('zurücksetzen entfernt die Figur', async () => {
        const { resetFigure } = await import('./figure');
        const { loadFigureMap } = await import('@/lib/figure-server');
        currentUser = 'user-nick';
        expect((await resetFigure()).success).toBe(true);
        expect((await loadFigureMap()).nick).toBeUndefined();
    });
});
