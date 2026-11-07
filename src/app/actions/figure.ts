'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isMoonzy, MOONZY_SKIN, normalizeFigure } from '@/lib/figure';

type Result = { success: true } | { success: false; error: string };

async function myPlayer() {
    const session = await auth();
    if (!session?.user?.id) return null;
    return prisma.player.findUnique({ where: { userId: session.user.id }, select: { id: true, name: true } });
}

// Speichert die Figur des angemeldeten Spielers; ungültige Werte werden abgelehnt
export async function saveFigure(raw: unknown): Promise<Result> {
    const player = await myPlayer();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    const spec = normalizeFigure(raw);
    if (!spec) return { success: false, error: 'Ungültige Figur' };
    // Moonzy bleibt dunkelhäutig, was auch eingeschickt wird
    const final = isMoonzy(player.name) ? { ...spec, skin: MOONZY_SKIN } : spec;
    await prisma.player.update({ where: { id: player.id }, data: { figure: JSON.stringify(final) } });
    revalidatePath('/players');
    return { success: true };
}

// Zurück zum Aussehen aus dem Namen
export async function resetFigure(): Promise<Result> {
    const player = await myPlayer();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    await prisma.player.update({ where: { id: player.id }, data: { figure: null } });
    revalidatePath('/players');
    return { success: true };
}
