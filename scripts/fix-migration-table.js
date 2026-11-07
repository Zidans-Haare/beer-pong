#!/usr/bin/env node
// Repariert _prisma_migrations vor `prisma migrate deploy`.
//
// Die aktuelle Prisma-Schema-Engine erwartet started_at/finished_at als Ganzzahl (Epoch-ms).
// In älteren bzw. von Hand ergänzten Einträgen stehen dort Texte wie '2026-05-17 07:16:43'.
// Dann stürzt die Engine mit "input contains invalid characters" ab und keine neue
// Migration lässt sich einspielen.
//
// Das Skript ändert nur diese beiden Spalten und nur, wenn dort Text steht (idempotent).
// Vor der ersten Änderung wird eine Kopie der DB-Datei neben die DB gelegt.
//
// Aufruf:  DATABASE_URL="file:/pfad/zur/dev.db" node scripts/fix-migration-table.js

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function readEnvFileUrl() {
    try {
        const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
        const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
        return line ? line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '') : '';
    } catch {
        return '';
    }
}

const url = process.env.DATABASE_URL || readEnvFileUrl();
if (!url.startsWith('file:')) {
    console.log('fix-migration-table: DATABASE_URL ist keine SQLite-Datei – übersprungen');
    process.exit(0);
}
const dbPath = path.resolve(url.slice('file:'.length).split('?')[0]);
if (!fs.existsSync(dbPath)) {
    console.log(`fix-migration-table: ${dbPath} existiert nicht – übersprungen`);
    process.exit(0);
}

const db = new Database(dbPath);
try {
    const hasTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get();
    if (!hasTable) {
        console.log('fix-migration-table: keine _prisma_migrations-Tabelle – übersprungen');
        process.exit(0);
    }

    const rows = db.prepare('SELECT id, started_at, finished_at FROM _prisma_migrations').all();
    const toMs = (value) => {
        if (typeof value !== 'string') return value;
        // SQLite-Text 'YYYY-MM-DD HH:MM:SS[.mmm]' ist UTC
        const ms = Date.parse(value.replace(' ', 'T') + (value.endsWith('Z') ? '' : 'Z'));
        return Number.isNaN(ms) ? value : ms;
    };
    const broken = rows.filter(r => typeof r.started_at === 'string' || typeof r.finished_at === 'string');

    if (broken.length === 0) {
        console.log('fix-migration-table: _prisma_migrations ist in Ordnung');
        process.exit(0);
    }

    const backup = `${dbPath}.before-migration-table-fix-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(dbPath, backup);
    console.log(`fix-migration-table: Backup ${backup}`);

    const update = db.prepare('UPDATE _prisma_migrations SET started_at = ?, finished_at = ? WHERE id = ?');
    db.transaction(() => {
        for (const r of broken) update.run(toMs(r.started_at), toMs(r.finished_at), r.id);
    })();
    console.log(`fix-migration-table: ${broken.length} Einträge umgewandelt`);
} finally {
    db.close();
}
