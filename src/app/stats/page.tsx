import Link from 'next/link';
import { Trophy, Swords, Flame, TrendingUp, Medal, User, FileSpreadsheet, Sparkles, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getAllPlayerStats } from '@/lib/stats';
import { getStatsInsights, MIN_DUELS, type StatsRecord } from '@/lib/stats-insights';
import { getSeasons, resolveSeasonParam, seasonRange, dateFilter } from '@/lib/seasons';
import StatsCharts from '@/components/StatsCharts';
import StatsExportButton from '@/components/StatsExportButton';
import StatsFilterBar from '@/components/StatsFilterBar';
import RankingFormulaInfo from '@/components/RankingFormulaInfo';
import StatsRanking, { type RankingRow } from '@/components/stats/StatsRanking';
import HeadToHead from '@/components/stats/HeadToHead';
import FormDots from '@/components/stats/FormDots';

export const dynamic = 'force-dynamic';

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ ranked?: string; season?: string }> }) {
    const { ranked, season: seasonParam } = await searchParams;
    const onlyRanked = ranked !== 'false';
    const t = await getTranslations('stats');

    // Saison: ohne Angabe die aktuelle, 'all' = alle Saisons zusammen
    const seasons = await getSeasons();
    const { selected: selectedSeason, isAll: allSeasons } = resolveSeasonParam(seasonParam, seasons);
    const currentSeasonId = (seasons.find(se => !se.endDate) ?? seasons[0])?.id ?? null;
    const range = seasonRange(selectedSeason);
    const dates = dateFilter(range);

    const session = await auth();
    const [allStats, insights, me, historicalCount, wrappeds] = await Promise.all([
        // der letzte Eintrag: alle veröffentlichten Rückblicke samt eigenem Gesehen-Vermerk
        getAllPlayerStats(onlyRanked, 'all', range),
        getStatsInsights(onlyRanked, range),
        session?.user?.id ? prisma.player.findUnique({ where: { userId: session.user.id }, select: { id: true } }) : null,
        prisma.tournament.count({ where: { status: 'COMPLETED', isHistorical: true, ...(dates ? { date: dates } : {}) } }),
        prisma.wrapped.findMany({
            where: { publishedAt: { not: null } },
            orderBy: { publishedAt: 'desc' },
            include: { views: { where: { userId: session?.user?.id ?? '' }, select: { id: true } } },
        }).catch(() => []),
    ]);

    // Nur Spieler mit Spielen oder Medaillen im gewählten Zeitraum
    const stats = allStats.filter(s => s.matchesPlayed > 0 || s.goldMedals + s.silverMedals + s.bronzeMedals > 0);
    const insightById = new Map(insights.players.map(p => [p.id, p]));

    const rows: RankingRow[] = stats.map(s => ({
        id: s.id,
        name: s.name.trim(),
        gold: s.goldMedals,
        silver: s.silverMedals,
        bronze: s.bronzeMedals,
        wins: s.matchesWon,
        played: s.matchesPlayed,
        winRate: s.winRate,
        cupDiff: s.cupDiff,
        tournaments: s.tournamentsPlayed,
        form: insightById.get(s.id)?.form ?? [],
        longestWinStreak: insightById.get(s.id)?.longestWinStreak ?? 0,
        isMe: s.id === me?.id,
    }));

    // Quoten zählen erst ab einer Mindestzahl Spiele (wächst mit der Saison, höchstens 10)
    const maxPlayed = Math.max(0, ...rows.map(r => r.played));
    const minGames = Math.min(10, Math.max(3, Math.ceil(maxPlayed * 0.3)));

    const myIndex = rows.findIndex(r => r.isMe);
    const myRow = myIndex >= 0 ? rows[myIndex] : null;
    const myInsight = me ? insightById.get(me.id) : undefined;
    const formLabels = { win: t('win'), loss: t('loss'), winShort: t('winShort'), lossShort: t('lossShort') };
    const scopeName = selectedSeason?.name ?? t('allSeasons');

    const h2hPlayers = insights.players
        .filter(p => p.opponents.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(p => ({ id: p.id, name: p.name, opponents: p.opponents, nemesisId: p.nemesisId, favoriteId: p.favoriteId }));

    // Diagramm: du selbst plus die ersten drei der Rangliste
    const series = stats.filter(s => s.history.length > 0).map(s => ({ id: s.id, name: s.name.trim(), history: s.history.map(h => ({ timestamp: h.timestamp, winRate: h.winRate })) }));
    const defaultChartIds = [...(me && series.some(s => s.id === me.id) ? [me.id] : []), ...series.map(s => s.id).filter(id => id !== me?.id)].slice(0, 4);

    const recordView = (r: StatsRecord) => {
        switch (r.key) {
            case 'winStreak': return { icon: Flame, title: t('recWinStreak'), detail: t('recWinStreakDetail', { count: r.count }), sub: null as string | null, href: null as string | null };
            case 'biggestWin': return { icon: Swords, title: t('recBiggestWin'), detail: t('recBiggestWinDetail', { score: r.score, opponent: r.opponent }), sub: r.tournament, href: r.href };
            case 'cupsInTournament': return { icon: Trophy, title: t('recCups'), detail: t('recCupsDetail', { cups: r.cups, games: r.games }), sub: r.tournament, href: r.href };
            case 'longestMatch': return { icon: TrendingUp, title: t('recLongest'), detail: t('recLongestDetail', { minutes: r.minutes, opponent: r.opponent }), sub: r.tournament, href: r.href };
        }
    };

    return (
        <div className="container page-content stats-page" style={{ paddingBottom: '100px' }}>
            <header className="stats-header">
                <div>
                    <h1 className="title-display" style={{ fontSize: '2rem' }}>{t('title')}</h1>
                    <p className="subtitle" style={{ fontSize: '0.9rem' }}>{scopeName} · {onlyRanked ? t('onlyRanked') : t('allTournamentsFilter')}</p>
                </div>
            </header>

            <StatsFilterBar
                seasons={seasons.map(se => ({ id: se.id, name: se.name }))}
                activeSeasonId={allSeasons ? 'all' : (selectedSeason?.id ?? 'all')}
                currentSeasonId={currentSeasonId}
                onlyRanked={onlyRanked}
            />

            {/* Eigene Bilanz */}
            {me && (
                <section className="stats-me" aria-label={t('myTitle', { scope: scopeName })}>
                    <div className="stats-me-head">
                        <User size={18} aria-hidden="true" />
                        <h2>{t('myTitle', { scope: scopeName })}</h2>
                    </div>
                    {myRow && myRow.played > 0 ? (
                        <>
                            <div className="stats-me-grid">
                                <div><span className="stats-me-value">{myIndex + 1}.</span><span className="stats-me-label">{t('place', { total: rows.length })}</span></div>
                                <div><span className="stats-me-value">{myRow.wins}–{myRow.played - myRow.wins}</span><span className="stats-me-label">{t('record')}</span></div>
                                <div><span className="stats-me-value">{Math.round(myRow.winRate * 100)}%</span><span className="stats-me-label">{t('rate')}</span></div>
                                <div><span className={`stats-me-value ${myRow.cupDiff > 0 ? 'is-positive' : myRow.cupDiff < 0 ? 'is-negative' : ''}`}>{myRow.cupDiff > 0 ? '+' : ''}{myRow.cupDiff}</span><span className="stats-me-label">{t('cupDiff')}</span></div>
                            </div>
                            <div className="stats-me-foot">
                                <span className="stats-me-foot-item"><span className="stats-me-label">{t('form')}</span><FormDots form={myRow.form} labels={formLabels} /></span>
                                {myInsight?.currentStreak && myInsight.currentStreak.count >= 2 && (
                                    <span className="stats-me-foot-item">
                                        <span className="stats-me-label">{t('streak')}</span>
                                        <strong>{t(myInsight.currentStreak.type === 'W' ? 'streakWins' : 'streakLosses', { count: myInsight.currentStreak.count })}</strong>
                                    </span>
                                )}
                                {myRow.gold + myRow.silver + myRow.bronze > 0 && (
                                    <span className="stats-me-foot-item">
                                        <span className="stats-me-label">{t('totalMedals')}</span>
                                        <span className="ranking-medals">
                                            {myRow.gold > 0 && <span className="medal-gold">{myRow.gold}G</span>}
                                            {myRow.silver > 0 && <span className="medal-silver">{myRow.silver}S</span>}
                                            {myRow.bronze > 0 && <span className="medal-bronze">{myRow.bronze}B</span>}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="stats-empty">{t('myEmpty')}</p>
                    )}
                </section>
            )}

            {/* Rangliste */}
            <section className="stats-section">
                <div className="stats-section-head">
                    <h2><Medal size={18} aria-hidden="true" /> {t('rankingTitle')}</h2>
                    <RankingFormulaInfo />
                </div>
                {rows.length === 0 ? (
                    <p className="stats-empty">{t('noData')}</p>
                ) : (
                    <StatsRanking rows={rows} minGames={minGames} />
                )}
                {historicalCount > 0 && <p className="ranking-note">{t('historicalNote', { count: historicalCount })}</p>}
            </section>

            {/* Direkter Vergleich */}
            {h2hPlayers.length > 0 && (
                <section className="stats-section">
                    <div className="stats-section-head">
                        <h2><Swords size={18} aria-hidden="true" /> {t('h2hTitle')}</h2>
                    </div>
                    <p className="stats-section-sub">{t('h2hSubtitle', { min: MIN_DUELS })}</p>
                    <HeadToHead players={h2hPlayers} defaultId={me?.id ?? null} />
                </section>
            )}

            {/* Rekorde */}
            {insights.records.length > 0 && (
                <section className="stats-section">
                    <div className="stats-section-head">
                        <h2><Flame size={18} aria-hidden="true" /> {t('recordsTitle')}</h2>
                    </div>
                    <div className="record-grid">
                        {insights.records.map(r => {
                            const v = recordView(r);
                            const Icon = v.icon;
                            return (
                                <div key={r.key} className="record-card">
                                    <span className="record-title"><Icon size={14} aria-hidden="true" /> {v.title}</span>
                                    <strong className="record-player">{r.player}</strong>
                                    <span className="record-detail">{v.detail}</span>
                                    {v.sub && v.href && <Link className="record-link" href={v.href}>{v.sub}</Link>}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Verlauf */}
            {series.length > 0 && (
                <section className="stats-section">
                    <div className="stats-section-head">
                        <h2><TrendingUp size={18} aria-hidden="true" /> {t('trendTitle')}</h2>
                    </div>
                    <p className="stats-section-sub">{t('trendSubtitle')}</p>
                    <StatsCharts series={series} defaultIds={defaultChartIds} />
                </section>
            )}

            {/* Rückblicke */}
            {wrappeds.length > 0 && (
                <section className="stats-section">
                    <div className="stats-section-head">
                        <h2><Sparkles size={18} aria-hidden="true" /> {t('wrappedTitle')}</h2>
                    </div>
                    <p className="stats-section-sub">{t('wrappedHint')}</p>
                    <ul className="wrapped-list">
                        {wrappeds.map(w => (
                            <li key={w.id}>
                                <Link href={`/wrapped?id=${w.id}`} className="wrapped-list-item">
                                    <span className="wrapped-list-text">
                                        <strong>{w.title}{w.views.length === 0 && <span className="ranking-me">{t('wrappedNew')}</span>}</strong>
                                        <span>{format(w.startDate, 'dd.MM.yyyy')} – {format(new Date(w.endDate.getTime() - 1), 'dd.MM.yyyy')}</span>
                                    </span>
                                    <span className="wrapped-list-cta">{t('wrappedOpen')} <ArrowRight size={16} aria-hidden="true" /></span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Export */}
            <section className="stats-section stats-export">
                <div className="stats-section-head">
                    <h2><FileSpreadsheet size={18} aria-hidden="true" /> {t('exportTitle')}</h2>
                </div>
                <p className="stats-section-sub">{t('exportHint')}</p>
                <StatsExportButton label={t('exportButton')} />
            </section>
        </div>
    );
}
