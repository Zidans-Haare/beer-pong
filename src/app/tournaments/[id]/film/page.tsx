import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/admin';
import { loadTournamentFilm } from '@/lib/tournament-film-server';
import { buildTournamentFilm } from '@/lib/tournament-film';
import { getSceneTheme } from '@/lib/scene-theme-server';
import { getSeasons, findSeasonForDate, accentCssVariables, DEFAULT_ACCENT } from '@/lib/seasons';
import TournamentFilm from '@/components/film/TournamentFilm';

export const dynamic = 'force-dynamic';

export default async function TournamentFilmPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ at?: string }> }) {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    const { id } = await params;
    const { at } = await searchParams;
    const t = await getTranslations('film');

    const input = await loadTournamentFilm(id);
    if (!input) {
        return (
            <div className="container page-content" style={{ textAlign: 'center', paddingTop: '64px' }}>
                <h1 className="title-display" style={{ fontSize: '2rem' }}>{t('brand')}</h1>
                <p style={{ color: 'var(--color-text-dim)', margin: '12px 0 24px' }}>{t('notAvailable')}</p>
                <Link href={`/tournaments/${id}`} className="btn btn-primary">{t('backToTournament')}</Link>
            </div>
        );
    }

    // Der Tisch trägt die Farbe der Saison, in der das Turnier gespielt wurde
    const season = findSeasonForDate(await getSeasons().catch(() => []), input.date);
    const primary = accentCssVariables(season?.accentColor ?? DEFAULT_ACCENT)['--color-primary'];
    // Hintergrund nach Wahl der Person, die den Film ansieht
    const model = { ...buildTournamentFilm(input, primary, (key, values) => t(key, values), await getLocale()), theme: await getSceneTheme(session.user.id) };
    // ?at=<Millisekunden> hält den Film an einer Stelle an (nur Admin, zum Prüfen)
    const startAt = isAdmin(session.user.email) && at && !isNaN(Number(at)) ? Number(at) : undefined;

    return <TournamentFilm model={model} tournamentId={id} initialTime={startAt} />;
}
