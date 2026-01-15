import { getTournament } from '@/app/actions/rsvp';
import { getPlayers } from '@/app/actions/players';
import RSVPForm from './rsvp-form';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import { startTournament } from '@/app/actions/tournaments';
import StartTournamentButton from './start-button';
import StartPlayoffsButton from './playoff-button';
import Bracket from '@/components/Bracket';
import TournamentTable from '@/components/TournamentTable';
import PlayerMatchesList from '@/components/PlayerMatchesList';
import { getTournamentStandings } from '@/lib/stats';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { deleteTournament } from '@/app/actions/tournaments';
import FinishTournamentButton from './finish-button';
import { LiveTicker } from '@/components/LiveTicker';
import { calculateSchedule, getEstimatedWaitTime } from '@/lib/scheduler';
import { getPublicSystemSettings } from '@/app/actions/admin';
import { MatchStatusBadge } from '@/components/MatchStatusBadge';
import { isAfter } from 'date-fns';
import AutoRefresh from '@/components/AutoRefresh';
import TournamentSummary from '@/components/TournamentSummary';
import TournamentQRCode from '@/components/TournamentQRCode';
import TournamentClientFeatures from '@/components/TournamentClientFeatures';

export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';
import GroupMatches from '@/components/GroupMatches';

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    noStore();
    const { id } = await params;
    const session = await auth();

    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            rsvps: { include: { player: true } },
            matches: { include: { player1: true, player2: true }, orderBy: [{ round: 'asc' }, { position: 'asc' }] }
        }
    });

    if (!tournament) notFound();

    const players = await getPlayers();
    const systemSettings = await getPublicSystemSettings();

    // Determine effective settings
    const duration = (tournament as any).matchDurationMin || systemSettings.matchDurationMin || 15;
    const tableCount = (tournament as any).tableCount || systemSettings.tableCount || 1;

    const schedule = calculateSchedule(
        tournament.matches,
        tournament.status === 'ACTIVE' ? new Date() : tournament.date,
        duration,
        tableCount
    );

    const currentPlayer = session?.user?.id ? players.find((p: any) => p.userId === session?.user?.id) : null;
    const waitTime = currentPlayer ? getEstimatedWaitTime(schedule, currentPlayer.id) : null;

    const isHost = session?.user?.id === tournament.hostId;
    const yesCount = tournament.rsvps.filter((r: { status: string }) => r.status === 'YES').length;
    const isPlanner = tournament.status === 'PLANNED';
    const isActive = tournament.status === 'ACTIVE' || tournament.status === 'COMPLETED';

    // Need to fetch matches? getTournament included them?
    // I need to update getTournament in `src/app/actions/rsvp.ts` to include matches

    // ... imports

    // Check if current user is the tournament winner
    const isCurrentUserWinner = (() => {
        if (tournament.status !== 'COMPLETED' || !currentPlayer) return false;
        const finalMatch = tournament.matches.find((m: any) => m.stage === 'BRACKET' && m.winnerId);
        const bracketMatches = tournament.matches.filter((m: any) => m.stage === 'BRACKET');
        if (bracketMatches.length === 0) return false;
        const maxRound = Math.max(...bracketMatches.map((m: any) => m.round));
        const finale = bracketMatches.find((m: any) => m.round === maxRound && m.position === 0);
        return finale?.winnerId === currentPlayer.id;
    })();

    return (
        <div className="container">
            {/* Client-side features: Wake Lock & Confetti */}
            <TournamentClientFeatures
                tournamentId={tournament.id}
                tournamentStatus={tournament.status}
                isWinner={isCurrentUserWinner}
            />

            <Link href="/tournaments" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)', display: 'inline-block' }}>
                &larr; Zurück zur Übersicht
            </Link>

            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '8px' }}>
                    <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--spacing-2)' }}>{tournament.name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                        {isPlanner && (
                            <TournamentQRCode
                                tournamentId={tournament.id}
                                tournamentName={tournament.name}
                                shortCode={tournament.shortCode || undefined}
                            />
                        )}
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                            Aktualisiert: {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-6)', color: 'var(--color-text)', flexWrap: 'wrap' }}>
                        <span>📅 {format(new Date(tournament.date), 'PPP p', { locale: de })}</span>
                        <span>📍 {tournament.location}</span>
                        <span>👥 {yesCount} Teilnehmer</span>
                        <span>🎮 {tournament.type}</span>
                        {tournament.status === 'COMPLETED' && <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✅ Beendet</span>}
                    </div>
                </div>
            </header>

            {/* Info Banner: Odd Player Count Warning */}
            {isPlanner && (tournament.type === 'ELIMINATION' || tournament.type === 'SINGLE_ELIMINATION') && yesCount % 2 !== 0 && yesCount > 0 && (
                <div className="glass-panel" style={{
                    padding: 'var(--spacing-4)',
                    marginBottom: 'var(--spacing-6)',
                    borderLeft: '4px solid orange',
                    background: 'rgba(255, 165, 0, 0.1)'
                }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'start' }}>
                        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                        <div>
                            <strong style={{ color: 'orange' }}>Ungerade Teilnehmerzahl</strong>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                Mit {yesCount} Spielern werden automatisch Freilose (Byes) generiert. Einige Spieler kommen direkt eine Runde weiter.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Banner: Bye Matches Detected (for active tournaments) */}
            {isActive && tournament.matches.some((m: any) => m.isPlayed && m.player1Id && !m.player2Id) && (
                <div className="glass-panel" style={{
                    padding: 'var(--spacing-4)',
                    marginBottom: 'var(--spacing-6)',
                    borderLeft: '4px solid var(--color-primary)',
                    background: 'rgba(var(--color-primary-rgb), 0.1)'
                }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'start' }}>
                        <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                        <div>
                            <strong>Freilose (Byes) vorhanden</strong>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                Aufgrund ungerader Teilnehmerzahl sind einige Spieler automatisch eine Runde weiter.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="tournament-grid">
                <div>
                    <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Teilnehmerliste</h2>
                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
                        {tournament.rsvps.length === 0 ? (
                            <p style={{ color: 'var(--color-text-dim)' }}>Noch keine Antworten.</p>
                        ) : (
                            <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--spacing-2)' }}>
                                {tournament.rsvps.map((rsvp: any) => (
                                    <li key={rsvp.id} style={{
                                        padding: 'var(--spacing-2)',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: 'var(--radius-sm)',
                                        textAlign: 'center',
                                        opacity: rsvp.status === 'NO' ? 0.5 : 1,
                                        border: rsvp.status === 'YES' ? '1px solid var(--color-success)' : rsvp.status === 'MAYBE' ? '1px solid orange' : '1px solid transparent'
                                    }}>
                                        <div>{rsvp.player.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: rsvp.status === 'YES' ? 'var(--color-success)' : rsvp.status === 'MAYBE' ? 'orange' : 'var(--color-danger)' }}>
                                            {rsvp.status === 'YES' ? 'Dabei' : rsvp.status === 'MAYBE' ? 'Vielleicht' : 'Abgesagt'}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Absagen toggle or something could go here */}
                </div>

                <aside>
                    {/* Waiting Time Info */}
                    {waitTime && !tournament.status.includes('COMPLETED') && (
                        <div className="glass-panel" style={{
                            padding: 'var(--spacing-4)',
                            marginBottom: 'var(--spacing-4)',
                            borderLeft: '4px solid var(--color-primary)',
                            background: 'rgba(var(--color-primary-rgb), 0.1)'
                        }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-2)' }}>🕒 Dein nächstes Spiel</h3>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                ca. {format(waitTime.startTime, 'HH:mm')} Uhr
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                an Tisch {waitTime.table}
                                {waitTime.afterMatchIds.length > 0 && ` (nach ${waitTime.afterMatchIds.length} Spiel${waitTime.afterMatchIds.length > 1 ? 'en' : ''})`}
                            </div>
                            <div style={{ marginTop: 'var(--spacing-2)', fontSize: '0.8rem' }}>
                                Wartezeit: ~{waitTime.waitMin} Min.
                            </div>
                        </div>
                    )}

                    {isPlanner && (
                        <>
                            {session?.user?.id ? (
                                (() => {
                                    // Find current user's player
                                    const currentPlayer = players.find((p: any) => p.userId === session?.user?.id);
                                    if (!currentPlayer) {
                                        return (
                                            <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                                <p style={{ marginBottom: 'var(--spacing-2)' }}>Du hast noch kein Spielerprofil.</p>
                                                <Link href="/register" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>Profil erstellen</Link>
                                                {/* Or edit/create flow if we had one separate from register */}
                                            </div>
                                        );
                                    }
                                    const userRsvp = tournament.rsvps.find((r: any) => r.playerId === currentPlayer.id);

                                    // Determine if it's a "Now" tournament (created roughly at the same time as the tournament date)
                                    // Or just check if the date is within the next hour of creation? 
                                    // A simpler check: if it's planned for today/now.
                                    const isNow = new Date(tournament.date).getTime() - new Date(tournament.createdAt).getTime() < 1000 * 60 * 60; // 1 hour threshold
                                    const rsvpTitle = isNow ? "🎫 Ab in die Lobby!" : "📅 Bist du dabei?";

                                    return <RSVPForm tournamentId={tournament.id} currentStatus={userRsvp?.status} title={rsvpTitle} />;
                                })()
                            ) : (
                                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                    <p>Bitte einloggen zum Teilnehmen.</p>
                                    <Link href="/login" className="btn btn-secondary">Login</Link>
                                </div>
                            )}
                        </>
                    )}
                </aside>
                {/* Action Buttons (Only for Host) */}
                {isHost && (
                    <div className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                        <h3 className="title-gradient" style={{ marginBottom: 'var(--spacing-2)' }}>Verwaltung</h3>

                        {/* Start Button */}
                        {tournament.status === 'PLANNED' && (
                            <div style={{ marginBottom: 'var(--spacing-4)' }}>
                                <StartTournamentButton tournamentId={tournament.id} />
                            </div>
                        )}

                        {/* Playoffs Button */}
                        {tournament.status === 'ACTIVE' && (tournament.type === 'ROUND_ROBIN' || tournament.type === 'GROUPS') && (
                            <StartPlayoffsButton tournamentId={tournament.id} />
                        )}

                        {/* Finish Button */}
                        {tournament.status === 'ACTIVE' && (
                            <FinishTournamentButton tournamentId={tournament.id} />
                        )}

                        {/* Delete Button */}
                        <div style={{ marginTop: 'var(--spacing-4)', paddingTop: 'var(--spacing-4)', borderTop: '1px solid var(--color-border)' }}>
                            <AdminDeleteButton id={tournament.id} type="Tournament" deleteAction={deleteTournament} />
                        </div>
                    </div>
                )}
            </div>

            {/* Auto-Refresh for Lobby (PLANNED) */}
            {isPlanner && (
                <div style={{ marginTop: 'var(--spacing-8)' }}>
                    <AutoRefresh intervalMs={10000} />
                </div>
            )}

            {isActive && (
                <div style={{ marginTop: 'var(--spacing-12)' }}>
                    {/* Show Summary for Completed Tournaments */}
                    {tournament.status === 'COMPLETED' && (
                        <TournamentSummary
                            tournamentId={tournament.id}
                            tournamentName={tournament.name}
                            tournamentType={tournament.type}
                            standings={await prisma.tournamentStanding.findMany({
                                where: { tournamentId: tournament.id },
                                include: { player: true },
                                orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }]
                            })}
                            matches={tournament.matches}
                        />
                    )}

                    {/* Show Live Ticker only for ACTIVE tournaments */}
                    {tournament.status === 'ACTIVE' && (
                        <>
                            <LiveTicker tournamentId={tournament.id} />

                            {/* User Specific View (For Non-Hosts/Players) */}
                            {!isHost && session?.user && (
                                <div style={{ marginBottom: 'var(--spacing-12)' }}>
                                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>Deine Spiele</h2>

                                    {(() => {
                                        const currentPlayer = players.find((p: any) => p.userId === session?.user?.id);
                                        if (!currentPlayer) return <p style={{ color: 'var(--color-text-dim)' }}>Kein Spielerprofil gefunden.</p>;

                                        return <PlayerMatchesList matches={schedule as any} currentPlayerId={currentPlayer.id} />;
                                    })()}
                                </div>
                            )}
                        </>
                    )}

                    {/* Show Tables for both ACTIVE and COMPLETED */}
                    {tournament.type === 'ROUND_ROBIN' && (
                        <>
                            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>Tabelle</h2>
                            <TournamentTable standings={await getTournamentStandings(tournament.id)} />
                        </>
                    )}

                    {tournament.type === 'GROUPS' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
                                <div>
                                    <h3 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-primary)' }}>Gruppe 1</h3>
                                    <TournamentTable standings={await getTournamentStandings(tournament.id, 'GROUP_1')} highlightTop={2} />
                                </div>
                                <div>
                                    <h3 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-primary)' }}>Gruppe 2</h3>
                                    <TournamentTable standings={await getTournamentStandings(tournament.id, 'GROUP_2')} highlightTop={2} />
                                </div>
                            </div>
                        </>
                    )}



                    {/* Show Bracket to Everyone */}
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)', marginTop: 'var(--spacing-12)' }}>Turnierplan & K.O.-Runde</h2>

                    {tournament.type !== 'SINGLE_ELIMINATION' && (
                        <GroupMatches matches={tournament.matches as any} />
                    )}

                    <Bracket matches={tournament.matches || []} />

                    {/* Auto-refresh only for ACTIVE */}
                    {tournament.status === 'ACTIVE' && <AutoRefresh intervalMs={20000} />}
                </div>
            )}
        </div>
    );
}
