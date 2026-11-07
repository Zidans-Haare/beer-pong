import 'server-only';
import { prisma } from '@/lib/prisma';
import { nameKey, normalizeFigure, type FigureMap } from '@/lib/figure';

// Alle gespeicherten Figuren nach Namen. Die Gruppe ist klein, deshalb wird einfach alles geladen.
export async function loadFigureMap(): Promise<FigureMap> {
    const players = await prisma.player.findMany({ where: { figure: { not: null }, isGuest: false }, select: { name: true, figure: true } }).catch(() => []);
    const map: FigureMap = {};
    for (const p of players) {
        const spec = normalizeFigure(p.figure);
        if (spec) map[nameKey(p.name)] = spec;
    }
    return map;
}
