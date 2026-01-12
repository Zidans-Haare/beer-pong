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
import AutoRefresh from '@/components/AutoRefresh';

import { LiveTicker } from '@/components/LiveTicker';

export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            rsvps: { include: { player: true } },
            matches: { include: { player1: true, player2: true }, orderBy: { id: 'asc' } }
        }
    });
    const players = await getPlayers();

    if (!tournament) notFound();

    const isHost = session?.user?.id === tournament.hostId;
    const yesCount = tournament.rsvps.filter((r: { status: string }) => r.status === 'YES').length;
    const isPlanner = tournament.status === 'PLANNED';
    const isActive = tournament.status === 'ACTIVE' || tournament.status === 'COMPLETED';

    // Need to fetch matches? getTournament included them?
    // I need to update getTournament in `src/app/actions/rsvp.ts` to include matches

    // ... imports

    return (
        <div className="container">
            <Link href="/tournaments" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)', display: 'inline-block' }}>
                &larr; Zurück zur Übersicht
            </Link>

            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '8px' }}>
                    <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--spacing-2)' }}>{tournament.name}</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-6)', color: 'var(--color-text)', flexWrap: 'wrap' }}>
                        <span>📅 {format(new Date(tournament.date), 'PPP p', { locale: de })}</span>
                        <span>📍 {tournament.location}</span>
                        <span>👥 {yesCount} Teilnehmer</span>
                        <span>🎮 {tournament.type}</span>
                        {tournament.status === 'COMPLETED' && <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✅ Beendet</span>}
                    </div>
                    {isPlanner && yesCount >= 2 && (
                        <StartTournamentButton tournamentId={tournament.id} />
                    )}
                </div>
            </header>

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

            {isActive && (
                <div style={{ marginTop: 'var(--spacing-12)' }}>
                    <LiveTicker tournamentId={tournament.id} />

                    {/* User Specific View (For Non-Hosts/Players) */}
                    {!isHost && session?.user && (
                        <div style={{ marginBottom: 'var(--spacing-12)' }}>
                            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>Deine Spiele</h2>

                            {(() => {
                                const currentPlayer = players.find((p: any) => p.userId === session?.user?.id);
                                if (!currentPlayer) return <p style={{ color: 'var(--color-text-dim)' }}>Kein Spielerprofil gefunden.</p>;

                                return <PlayerMatchesList matches={tournament.matches} currentPlayerId={currentPlayer.id} />;
                            })()}
                        </div>
                    )}

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
                                    <TournamentTable standings={await getTournamentStandings(tournament.id, 'GROUP_1')} />
                                </div>
                                <div>
                                    <h3 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-primary)' }}>Gruppe 2</h3>
                                    <TournamentTable standings={await getTournamentStandings(tournament.id, 'GROUP_2')} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Only Host sees the full Bracket */}
                    {isHost && (
                        <>
                            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)', marginTop: 'var(--spacing-12)' }}>Gesamter Turnierplan (Host)</h2>
                            <Bracket matches={tournament.matches || []} />
                        </>
                    )}

                    {/* Optional: Add a toggle for players to see full bracket if they really want to? 
                        User said "everyone sees only their games", so default hidden is correct. 
                    */}

                    <AutoRefresh />
                </div>
            )}
        </div>
    );
}
