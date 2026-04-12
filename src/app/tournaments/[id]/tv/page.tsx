import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';
import { calculateSchedule } from '@/lib/scheduler';
import { getPublicSystemSettings } from '@/app/actions/admin';
import TvStandingsTable from '@/components/tv/TvStandingsTable';
import { getTournamentStandings } from '@/lib/stats';
import { getTeamDisplayName } from '@/lib/team-utils';
import TvControls from '@/components/tv/TvControls';
import TvBracketSlider from '@/components/tv/TvBracketSlider';
import TvBracketSliderWrapper from '@/components/tv/TvBracketSliderWrapper';
import TvAutoRefresh from '@/components/tv/TvAutoRefresh';
import TvResultOverlay from '@/components/tv/TvResultOverlay';
import TvLivestream from '@/components/tv/TvLivestream';
import TvWebRTC from '@/components/tv/TvWebRTC';
import TvChat from '@/components/tv/TvChat';

const WEBRTC_FLAG = '__webrtc__';

export const dynamic = 'force-dynamic';

export default async function TvPage({ params }: { params: Promise<{ id: string }> }) {
    noStore();
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            matches: {
                include: {
                    player1: true,
                    player2: true,
                    team1: {
                        include: {
                            player1: { select: { id: true, name: true, image: true } },
                            player2: { select: { id: true, name: true, image: true } },
                            guest1: { select: { id: true, name: true } },
                            guest2: { select: { id: true, name: true } }
                        }
                    },
                    team2: {
                        include: {
                            player1: { select: { id: true, name: true, image: true } },
                            player2: { select: { id: true, name: true, image: true } },
                            guest1: { select: { id: true, name: true } },
                            guest2: { select: { id: true, name: true } }
                        }
                    }
                },
                orderBy: [{ round: 'asc' }, { position: 'asc' }]
            },
        }
    });

    if (!tournament) notFound();

    const systemSettings = await getPublicSystemSettings();
    const duration = tournament.matchDurationMin || systemSettings.matchDurationMin || 15;
    const tableCount = tournament.tableCount || systemSettings.tableCount || 1;

    const schedule = calculateSchedule(
        tournament.matches,
        tournament.status === 'ACTIVE' ? new Date() : tournament.date,
        duration,
        tableCount
    );

    const isTeamMode = tournament.mode === 'TEAM';
    const hasGroupMatches = tournament.type === 'GROUPS';
    const hasRoundRobin = tournament.type === 'ROUND_ROBIN';
    const hasStandings = hasRoundRobin || hasGroupMatches;

    const standings = hasStandings ? await getTournamentStandings(tournament.id) : null;
    const standingsA = hasGroupMatches ? await getTournamentStandings(tournament.id, 'GROUP_1') : null;
    const standingsB = hasGroupMatches ? await getTournamentStandings(tournament.id, 'GROUP_2') : null;

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Beer Pong';

    // --- Match classification ---
    const unplayed = schedule.filter(m =>
        !m.isPlayed &&
        ((m as any).player1Id || (m as any).team1Id) &&
        ((m as any).player2Id || (m as any).team2Id)
    );

    // Active: one per table, no player busy twice
    const activeMatchIds = new Set<string>();
    const busyIds = new Set<string>();
    for (let t = 1; t <= tableCount; t++) {
        const next = unplayed.find(m => {
            const e1 = (m as any).player1Id || (m as any).team1Id;
            const e2 = (m as any).player2Id || (m as any).team2Id;
            return m.tableNumber === t && !busyIds.has(e1) && !busyIds.has(e2);
        });
        if (next) {
            activeMatchIds.add(next.id);
            const e1 = (next as any).player1Id || (next as any).team1Id;
            const e2 = (next as any).player2Id || (next as any).team2Id;
            if (e1) busyIds.add(e1);
            if (e2) busyIds.add(e2);
        }
    }

    const activeMatches = unplayed.filter(m => activeMatchIds.has(m.id));
    const upcomingMatches = unplayed.filter(m => !activeMatchIds.has(m.id)).slice(0, 3);
    const recentMatches = schedule
        .filter(m => m.isPlayed && ((m as any).player1Id || (m as any).team1Id))
        .slice(-4)
        .reverse();

    // Bracket matches for elimination view
    const bracketMatches = schedule.filter(m => m.stage === 'BRACKET');
    const maxRound = bracketMatches.length > 0 ? Math.max(...bracketMatches.map(m => m.round)) : 0;
    const bracketByRound = bracketMatches.reduce((acc, m) => {
        if (!acc[m.round]) acc[m.round] = [];
        acc[m.round].push(m);
        return acc;
    }, {} as Record<number, typeof bracketMatches>);
    const roundNumbers = Object.keys(bracketByRound).map(Number).sort((a, b) => a - b);

    function getRoundLabel(round: number) {
        if (round === maxRound) return 'Finale';
        if (round === maxRound - 1) return 'Halbfinale';
        if (round === maxRound - 2) return 'Viertelfinale';
        return `Runde ${round}`;
    }

    function getEntityName(match: any): { name1: string; name2: string } {
        if (isTeamMode) {
            return {
                name1: match.team1 ? getTeamDisplayName(match.team1) : '?',
                name2: match.team2 ? getTeamDisplayName(match.team2) : '?',
            };
        }
        return {
            name1: match.player1?.name ?? '?',
            name2: match.player2?.name ?? '?',
        };
    }

    // For round robin / group tournaments: all matches grouped by round as a slider
    const rrRoundNumbers = hasStandings
        ? [...new Set(schedule
            .filter(m => m.stage !== 'BRACKET' && ((m as any).player1Id || (m as any).team1Id) && ((m as any).player2Id || (m as any).team2Id))
            .map(m => m.round)
          )].sort((a, b) => a - b)
        : [];

    const rrMatchesByRound = rrRoundNumbers.reduce((acc, r) => {
        acc[r] = schedule.filter(m =>
            m.stage !== 'BRACKET' &&
            m.round === r &&
            ((m as any).player1Id || (m as any).team1Id) &&
            ((m as any).player2Id || (m as any).team2Id)
        );
        return acc;
    }, {} as Record<number, typeof schedule>);

    const rrRounds = rrRoundNumbers.map(round => ({
        round,
        label: `Runde ${round}`,
        matches: rrMatchesByRound[round].map(match => {
            const { name1, name2 } = getEntityName(match);
            return {
                id: match.id,
                round: match.round,
                isPlayed: match.isPlayed,
                score1: (match as any).score1 ?? null,
                score2: (match as any).score2 ?? null,
                winnerId: (match as any).winnerId ?? null,
                player1Id: (match as any).player1Id ?? null,
                player2Id: (match as any).player2Id ?? null,
                team1Id: (match as any).team1Id ?? null,
                team2Id: (match as any).team2Id ?? null,
                name1,
                name2,
                isActive: activeMatchIds.has(match.id),
            };
        }),
    }));

    const bracketRounds = roundNumbers.map(round => ({
        round,
        label: getRoundLabel(round),
        matches: bracketByRound[round].map(match => {
            const { name1, name2 } = getEntityName(match);
            return {
                id: match.id,
                round: match.round,
                isPlayed: match.isPlayed,
                score1: (match as any).score1 ?? null,
                score2: (match as any).score2 ?? null,
                winnerId: (match as any).winnerId ?? null,
                player1Id: (match as any).player1Id ?? null,
                player2Id: (match as any).player2Id ?? null,
                team1Id: (match as any).team1Id ?? null,
                team2Id: (match as any).team2Id ?? null,
                name1,
                name2,
                isActive: activeMatchIds.has(match.id),
            };
        }),
    }));

    const overlayResults = schedule
        .filter(m => m.isPlayed && ((m as any).player1Id || (m as any).team1Id))
        .map(m => {
            const { name1, name2 } = getEntityName(m);
            return {
                id: m.id,
                name1,
                name2,
                score1: (m as any).score1 ?? null,
                score2: (m as any).score2 ?? null,
                winnerId: (m as any).winnerId ?? null,
                p1Id: (m as any).player1Id || (m as any).team1Id || null,
                p2Id: (m as any).player2Id || (m as any).team2Id || null,
            };
        });

    const statusLabel = tournament.status === 'ACTIVE' ? '● LIVE'
        : tournament.status === 'COMPLETED' ? 'BEENDET'
        : 'GEPLANT';
    const statusColor = tournament.status === 'ACTIVE' ? 'var(--color-lobby)'
        : tournament.status === 'COMPLETED' ? 'var(--color-text-dim)'
        : 'var(--color-secondary)';
    const statusBg = tournament.status === 'ACTIVE' ? 'var(--color-lobby-light)'
        : 'var(--color-surface-secondary)';
    const statusBorder = tournament.status === 'ACTIVE' ? 'var(--color-lobby-border)'
        : 'var(--color-border)';

    const tvCss = `
@keyframes ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.section-header {
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 800;
  margin-bottom: 12px;
}

/* ── Portrait gate: shown only in portrait on small screens ── */
.tv-portrait-gate { display: none; }
@media (orientation: portrait) and (max-width: 1024px) {
  .tv-portrait-gate {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: 100000;
    background: #000;
    color: #fff;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    text-align: center;
    padding: 40px;
  }
}

/* ── Broadcast layout (stream + sidebar) ── */
.tv-broadcast-grid {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}
@media (max-height: 520px) and (orientation: landscape) {
  .tv-broadcast-grid {
    grid-template-columns: minmax(0, 1fr) clamp(160px, 26vw, 280px);
    gap: 10px;
    padding: 10px;
  }
}

/* ── Default layout (left + right panels) ── */
.tv-default-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0;
  overflow: hidden;
}
.tv-default-left, .tv-default-right {
  overflow: hidden;
}
@media (max-height: 520px) and (orientation: landscape) {
  /* Horizontal snap-scroll: each panel = one full-screen slide */
  .tv-default-grid {
    display: flex !important;
    flex-direction: row !important;
    overflow-x: scroll !important;
    overflow-y: hidden !important;
    scroll-snap-type: x mandatory !important;
    -webkit-overflow-scrolling: touch;
    grid-template-columns: unset !important;
  }
  .tv-default-left, .tv-default-right {
    min-width: 100vw !important;
    width: 100vw !important;
    flex-shrink: 0 !important;
    scroll-snap-align: start !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch;
    padding: 10px 14px !important;
    display: block !important;
    border-right: none !important;
  }
  /* Bracket: release flex-fill so all matches render in scroll */
  .tv-default-right .tv-bracket-slider {
    flex: none !important;
    overflow: visible !important;
  }
  .tv-default-right .tv-bracket-slider .tv-bracket-matches {
    overflow: visible !important;
    flex: none !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 5px !important;
  }
  /* Extra-small match cards on mobile */
  .tv-default-right .tv-bracket-slider .tv-bracket-match {
    font-size: 0.72rem !important;
  }
  .tv-default-right .tv-bracket-slider .tv-bracket-match-row {
    padding: 4px 8px !important;
    font-size: 0.72rem !important;
  }
}

/* ── Header compact on mobile landscape ── */
@media (max-height: 520px) and (orientation: landscape) {
  .tv-header {
    padding: 6px 16px !important;
  }
  .tv-header h1 {
    font-size: 1.1rem !important;
  }
}

/* ── Chat hidden on mobile landscape ── */
@media (max-height: 520px) and (orientation: landscape) {
  .tv-broadcast-chat { display: none !important; }
}
`;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            overflow: 'hidden',
            fontFamily: 'var(--font-heading)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <style dangerouslySetInnerHTML={{ __html: tvCss }} />
            <TvAutoRefresh intervalMs={10000} />
            <TvResultOverlay results={overlayResults} />

            {/* ── Portrait gate (mobile only) ── */}
            <div className="tv-portrait-gate">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                    <path d="M5 12 L2 9 L5 6" />
                    <path d="M19 12 L22 9 L19 6" />
                </svg>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Gerät drehen</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.55, maxWidth: '260px', lineHeight: 1.5 }}>
                    Die TV-Ansicht ist für Querformat optimiert. Bitte Gerät drehen.
                </div>
            </div>

            {/* ── Header ── */}
            <div className="tv-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: tournament.liveStreamUrl ? '10px 30px' : 'clamp(14px, 2vw, 28px) clamp(20px, 4vw, 56px)',
                borderBottom: '2px solid #e5e7eb',
                background: '#ffffff',
                flexShrink: 0,
                zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--color-primary)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '18px',
                        color: '#000'
                    }}>B</div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1px' }}>
                            {appName} {tournament.liveStreamUrl && '• LIVE'}
                        </div>
                        <h1 style={{ fontSize: tournament.liveStreamUrl ? '1.5rem' : 'clamp(1.4rem, 3.5vw, 3rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#111827' }}>
                            {tournament.name}
                        </h1>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        background: tournament.status === 'ACTIVE' ? '#ef4444' : '#f3f4f6',
                        color: tournament.status === 'ACTIVE' ? '#fff' : '#6b7280',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        {tournament.status === 'ACTIVE' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.8)' }} />}
                        {statusLabel}
                    </div>
                    <TvControls />
                </div>
            </div>

            {/* ── Content Area ── */}
            {tournament.liveStreamUrl ? (
                /* UNIFIED BROADCAST LAYOUT */
                <div className="tv-broadcast-grid">
                    {/* Main: Stream */}
                    <div style={{ position: 'relative' }}>
                         {tournament.liveStreamUrl?.startsWith(WEBRTC_FLAG)
                             ? <TvWebRTC tournamentId={tournament.id} />
                             : <TvLivestream roomName={tournament.liveStreamUrl!} />
                         }
                    </div>

                    {/* Sidebar: Standings (RR/Groups) or Bracket (Elimination) */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        overflow: 'hidden',
                    }}>
                        {hasGroupMatches && standingsA && standingsB && (
                            <>
                                <div>
                                    <div className="section-header" style={{ fontSize: '0.7rem', marginBottom: '10px' }}>Gruppe A</div>
                                    <TvStandingsTable standings={standingsA} highlightTop={2} label={isTeamMode ? 'Team' : 'Spieler'} compact maxVisible={6} />
                                </div>
                                <div>
                                    <div className="section-header" style={{ fontSize: '0.7rem', marginBottom: '10px' }}>Gruppe B</div>
                                    <TvStandingsTable standings={standingsB} highlightTop={2} label={isTeamMode ? 'Team' : 'Spieler'} compact maxVisible={6} />
                                </div>
                            </>
                        )}
                        {hasRoundRobin && standings && (
                            <div>
                                <div className="section-header" style={{ fontSize: '0.7rem', marginBottom: '10px' }}>Tabelle</div>
                                <TvStandingsTable standings={standings} label={isTeamMode ? 'Team' : 'Spieler'} compact maxVisible={6} />
                            </div>
                        )}
                        {hasStandings && rrRounds.length > 0 && (
                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div className="section-header" style={{ fontSize: '0.7rem', marginBottom: '10px' }}>Runden</div>
                                <TvBracketSlider rounds={rrRounds} compact />
                            </div>
                        )}
                        {!hasStandings && bracketRounds.length > 0 && (
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div className="section-header" style={{ fontSize: '0.7rem', marginBottom: '10px' }}>Bracket</div>
                                <TvBracketSlider rounds={bracketRounds} />
                            </div>
                        )}
                        {!hasStandings && bracketRounds.length === 0 && recentMatches.length > 0 && (
                            <div>
                                <div className="section-header" style={{ fontSize: '0.7rem', marginBottom: '10px' }}>Zuletzt gespielt</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {recentMatches.map(m => {
                                        const { name1, name2 } = getEntityName(m);
                                        return (
                                            <div key={m.id} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name1}</span>
                                                <span style={{ fontWeight: 700, color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>{(m as any).score1}:{(m as any).score2}</span>
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name2}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Chat (Twitch-style) — hidden on mobile via CSS */}
                        <div className="tv-broadcast-chat" style={{ flex: 1, minHeight: 0, borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header" style={{ fontSize: '0.7rem', marginBottom: '10px' }}>Chat</div>
                            <TvChat />
                        </div>
                    </div>
                </div>
            ) : (
                /* DEFAULT MULTI-VIEW LAYOUT */
                <div className="tv-default-grid">

                {/* ── Left: Round Slider (RR/Groups) or Live + Upcoming + Recent (Elimination) ── */}
                <div className="tv-default-left" style={{ padding: 'clamp(16px, 2.5vw, 32px) clamp(20px, 3vw, 40px)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>

                    {/* Round robin / groups: show all rounds as slider */}
                    {hasStandings && rrRounds.length > 0 && (
                        <TvBracketSliderWrapper rounds={rrRounds} />
                    )}

                    {/* Elimination: show active / upcoming / recent */}
                    {!hasStandings && activeMatches.length > 0 && (
                        <section style={{ marginBottom: 'clamp(18px, 2.5vw, 36px)' }}>
                            <div className="section-header" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.85rem)' }}>Läuft gerade</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1vw, 14px)' }}>
                                {activeMatches.map(match => {
                                    const { name1, name2 } = getEntityName(match);
                                    const w1 = (match as any).score1 ?? null;
                                    const w2 = (match as any).score2 ?? null;
                                    return (
                                        <div key={match.id} style={{
                                            background: 'var(--color-surface)',
                                            border: '2px solid var(--color-lobby-border)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: 'clamp(12px, 1.5vw, 22px) clamp(14px, 2vw, 28px)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'clamp(10px, 1.5vw, 20px)',
                                            boxShadow: 'var(--shadow-md)',
                                        }}>
                                            <div style={{
                                                background: 'var(--color-lobby-light)',
                                                color: 'var(--color-lobby)',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: 'clamp(3px, 0.5vw, 6px) clamp(8px, 1vw, 14px)',
                                                fontSize: 'clamp(0.7rem, 1.1vw, 1rem)',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                Tisch {match.tableNumber}
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <span style={{ fontWeight: 800, fontSize: 'clamp(1rem, 2.2vw, 2rem)', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name1}</span>
                                                <span style={{ color: 'var(--color-text-subtle)', fontWeight: 700, fontSize: 'clamp(0.75rem, 1.3vw, 1.2rem)', whiteSpace: 'nowrap' }}>
                                                    {w1 !== null ? `${w1} : ${w2}` : 'vs'}
                                                </span>
                                                <span style={{ fontWeight: 800, fontSize: 'clamp(1rem, 2.2vw, 2rem)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name2}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Upcoming */}
                    {!hasStandings && upcomingMatches.length > 0 && (
                        <section style={{ marginBottom: 'clamp(18px, 2.5vw, 36px)' }}>
                            <div className="section-header" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.85rem)' }}>Nächste Spiele</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 0.8vw, 12px)' }}>
                                {upcomingMatches.map((match, i) => {
                                    const { name1, name2 } = getEntityName(match);
                                    return (
                                        <div key={match.id} style={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: 'clamp(10px, 1.2vw, 18px) clamp(12px, 1.5vw, 22px)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            opacity: 1 - i * 0.15,
                                        }}>
                                            <div style={{
                                                background: 'var(--color-surface-secondary)',
                                                color: 'var(--color-text-dim)',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: 'clamp(2px, 0.4vw, 5px) clamp(6px, 0.8vw, 12px)',
                                                fontSize: 'clamp(0.65rem, 1vw, 0.9rem)',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                Tisch {match.tableNumber}
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <span style={{ fontWeight: 600, fontSize: 'clamp(0.9rem, 1.8vw, 1.6rem)', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name1}</span>
                                                <span style={{ color: 'var(--color-text-subtle)', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)' }}>vs</span>
                                                <span style={{ fontWeight: 600, fontSize: 'clamp(0.9rem, 1.8vw, 1.6rem)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name2}</span>
                                            </div>
                                            <div style={{ color: 'var(--color-text-subtle)', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)', whiteSpace: 'nowrap' }}>
                                                {match.scheduledStart.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Recent results */}
                    {!hasStandings && recentMatches.length > 0 && (
                        <section>
                            <div className="section-header" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.85rem)' }}>Zuletzt gespielt</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {recentMatches.map(match => {
                                    const { name1, name2 } = getEntityName(match);
                                    const score1 = (match as any).score1 ?? '–';
                                    const score2 = (match as any).score2 ?? '–';
                                    const winnerId = (match as any).winnerId;
                                    const p1Id = (match as any).player1Id || (match as any).team1Id;
                                    const p1Won = winnerId && winnerId === p1Id;
                                    return (
                                        <div key={match.id} style={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '9px 14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            opacity: 0.75,
                                        }}>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <span style={{
                                                    fontWeight: p1Won ? 700 : 400,
                                                    fontSize: 'clamp(0.8rem, 1.5vw, 1.3rem)',
                                                    flex: 1,
                                                    textAlign: 'right',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: p1Won ? 'var(--color-text)' : 'var(--color-text-dim)',
                                                }}>{name1}</span>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: 'clamp(0.8rem, 1.5vw, 1.3rem)',
                                                    color: 'var(--color-text)',
                                                    whiteSpace: 'nowrap',
                                                    padding: '2px 8px',
                                                    background: 'var(--color-surface-secondary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                }}>
                                                    {score1} : {score2}
                                                </span>
                                                <span style={{
                                                    fontWeight: !p1Won && winnerId ? 700 : 400,
                                                    fontSize: 'clamp(0.8rem, 1.5vw, 1.3rem)',
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: !p1Won && winnerId ? 'var(--color-text)' : 'var(--color-text-dim)',
                                                }}>{name2}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {!hasStandings && activeMatches.length === 0 && upcomingMatches.length === 0 && recentMatches.length === 0 && (
                        <div style={{ color: 'var(--color-text-subtle)', fontSize: '1rem', paddingTop: '40px', textAlign: 'center' }}>
                            {tournament.status === 'PLANNED' ? 'Turnier startet bald…' : 'Keine Spiele vorhanden.'}
                        </div>
                    )}
                </div>

                {/* ── Right: Standings + Bracket ── */}
                <div className="tv-default-right" style={{ padding: 'clamp(16px, 2.5vw, 32px) clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: 'clamp(20px, 3vw, 40px)' }}>

                    {/* Round Robin: Standings */}
                    {hasRoundRobin && standings && standings.length > 0 && (
                        <div>
                            <div className="section-header" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.85rem)' }}>Tabelle</div>
                            <TvStandingsTable standings={standings} label={isTeamMode ? 'Team' : 'Spieler'} />
                        </div>
                    )}

                    {/* Group Standings */}
                    {hasGroupMatches && standingsA && standingsB && standingsA.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(12px, 2vw, 24px)' }}>
                            <div>
                                <div className="section-header" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.85rem)' }}>Gruppe A</div>
                                <TvStandingsTable standings={standingsA} highlightTop={2} label={isTeamMode ? 'Team' : 'Spieler'} />
                            </div>
                            <div>
                                <div className="section-header" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.85rem)' }}>Gruppe B</div>
                                <TvStandingsTable standings={standingsB} highlightTop={2} label={isTeamMode ? 'Team' : 'Spieler'} />
                            </div>
                        </div>
                    )}

                    {/* Elimination: Auto-cycling Bracket Slider */}
                    {!hasStandings && bracketMatches.length > 0 && (
                        <TvBracketSliderWrapper rounds={bracketRounds} />
                    )}

                    {/* Empty state */}
                    {!hasStandings && bracketMatches.length === 0 && (
                        <div style={{ color: 'var(--color-text-subtle)', fontSize: 'clamp(0.9rem, 1.5vw, 1.2rem)', paddingTop: '20px', textAlign: 'center' }}>
                            {tournament.status === 'PLANNED' ? 'Bracket wird nach Turnierstart generiert.' : 'Keine Daten verfügbar.'}
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
}
