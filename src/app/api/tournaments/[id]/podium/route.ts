import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { loadTournamentFilm } from '@/lib/tournament-film-server';
import { buildPodium } from '@/lib/tournament-film';

export const dynamic = 'force-dynamic';

// Abgeschlossene Turniere ändern sich selten: Das Podium wird eine Minute lang gemerkt, damit die Antwort sofort da ist
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; podium: ReturnType<typeof buildPodium> }>();

// Top 3 eines abgeschlossenen Turniers für das Sieger-Overlay
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json({ podium: hit.podium }, { headers: { 'Cache-Control': 'no-store' } });
    const input = await loadTournamentFilm(id);
    const podium = input ? buildPodium(input) : [];
    if (input) cache.set(id, { at: Date.now(), podium });
    return NextResponse.json({ podium }, { headers: { 'Cache-Control': 'no-store' } });
}
