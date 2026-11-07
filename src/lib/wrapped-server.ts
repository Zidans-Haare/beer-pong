import 'server-only';
import { prisma } from '@/lib/prisma';
import { getAllPlayerStats } from '@/lib/stats';
import { getInsightMatches } from '@/lib/stats-insights';
import { computeWrapped, type WrappedData } from '@/lib/wrapped';
import type { SeasonRange } from '@/lib/seasons';

// So viele Tage bleibt der Hinweis nach dem Ansehen auf der Startseite
export const WRAPPED_HOME_DAYS = 7;

// Zuletzt veröffentlichter Rückblick (für alle sichtbar)
export async function getActiveWrapped() {
    return prisma.wrapped.findFirst({ where: { publishedAt: { not: null } }, orderBy: { publishedAt: 'desc' } });
}

// Rückblick aller Spieler für einen Zeitraum; zählt alle Turniere, auch Spaß-Turniere
export async function loadWrapped(range: SeasonRange): Promise<Map<string, WrappedData>> {
    const [matches, stats] = await Promise.all([getInsightMatches(false, range), getAllPlayerStats(false, 'all', range)]);
    const ranked = stats.filter(s => s.matchesPlayed > 0 || s.goldMedals + s.silverMedals + s.bronzeMedals > 0);
    return computeWrapped(matches, {
        medals: new Map(ranked.map(s => [s.id, { gold: s.goldMedals, silver: s.silverMedals, bronze: s.bronzeMedals }])),
        ranking: ranked.map(s => s.id),
    });
}
