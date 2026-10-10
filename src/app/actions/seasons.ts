'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { isHexColor } from '@/lib/seasons';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.email)) throw new Error('Unauthorized');
}

type Result = { success: true } | { success: false; error: string };

function revalidateSeasonViews() {
    revalidatePath('/', 'layout');
}

function validate(name: string, accentColor: string): string | null {
    if (!name.trim()) return 'Bitte einen Namen eingeben';
    if (name.trim().length > 60) return 'Der Name darf höchstens 60 Zeichen lang sein';
    if (!isHexColor(accentColor)) return 'Ungültige Farbe';
    return null;
}

export async function updateSeason(id: string, name: string, accentColor: string): Promise<Result> {
    await requireAdmin();
    const error = validate(name, accentColor);
    if (error) return { success: false, error };
    try {
        await prisma.season.update({ where: { id }, data: { name: name.trim(), accentColor } });
        revalidateSeasonViews();
        return { success: true };
    } catch (e) {
        console.error('updateSeason failed:', e);
        return { success: false, error: 'Saison konnte nicht gespeichert werden' };
    }
}

// Beendet die aktuelle Saison (Enddatum = jetzt) und startet die nächste mit neuem Namen und neuer Farbe.
export async function endSeasonAndStartNext(nextName: string, nextAccentColor: string): Promise<Result> {
    await requireAdmin();
    const error = validate(nextName, nextAccentColor);
    if (error) return { success: false, error };

    try {
        const current = await prisma.season.findFirst({ where: { endDate: null }, orderBy: { startDate: 'desc' } });
        if (!current) return { success: false, error: 'Es gibt keine laufende Saison' };

        // Laufende Turniere würden nach dem Wechsel in der alten Saison zu Ende gespielt
        const running = await prisma.tournament.count({ where: { status: 'ACTIVE' } });
        if (running > 0) return { success: false, error: 'Es läuft noch ein Turnier. Bitte erst beenden, dann die Saison wechseln.' };

        const now = new Date();
        await prisma.$transaction([
            prisma.season.update({ where: { id: current.id }, data: { endDate: now } }),
            prisma.season.create({ data: { name: nextName.trim(), startDate: now, accentColor: nextAccentColor } }),
        ]);

        revalidateSeasonViews();
        return { success: true };
    } catch (e) {
        console.error('endSeasonAndStartNext failed:', e);
        return { success: false, error: 'Saisonwechsel fehlgeschlagen' };
    }
}
