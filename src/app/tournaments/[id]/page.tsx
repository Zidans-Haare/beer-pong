import { getPlayers } from '@/app/actions/players';
import RSVPForm from './rsvp-form';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';

import StartTournamentButton from './start-button';
import StartPlayoffsButton from './playoff-button';
import Bracket from '@/components/Bracket';
import TournamentTable from '@/components/TournamentTable';
import { getTournamentStandings } from '@/lib/stats';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { deleteTournament } from '@/app/actions/tournaments';
import FinishTournamentButton from './finish-button';
import { LiveTicker } from '@/components/LiveTicker';
import { calculateSchedule, getEstimatedWaitTime } from '@/lib/scheduler';
import { getPublicSystemSettings } from '@/app/actions/admin';
import AutoRefresh from '@/components/AutoRefresh';
import TournamentSummary from '@/components/TournamentSummary';
import TournamentQRCode from '@/components/TournamentQRCode';
import TournamentClientFeatures from '@/components/TournamentClientFeatures';
import LobbyPresence from '@/components/LobbyPresence';
import { getTournamentForecast } from '@/lib/duration';
import TournamentHeader from '@/components/tournament/TournamentHeader';
import TeamAssignment from '@/components/TeamAssignment';
import { Users, User } from 'lucide-react';

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
            matches: { include: { player1: true, player2: true }, orderBy: [{ round: 'asc' }, { position: 'asc' }] },
            teams: {
                include: {
                    player1: { select: { id: true, name: true, image: true } },
                    player2: { select: { id: true, name: true, image: true } },
                    guest1: { select: { id: true, name: true } },
                    guest2: { select: { id: true, name: true } }
                }
            },
            guests: {
                where: { expiresAt: { gt: new Date() } }
            }
        }
    });

    if (!tournament) notFound();

    const players = await getPlayers();
    const systemSettings = await getPublicSystemSettings();

    // Determine effective settings
    const duration = tournament.matchDurationMin || systemSettings.matchDurationMin || 15;
    const tableCount = tournament.tableCount || systemSettings.tableCount || 1;

    const schedule = calculateSchedule(
        tournament.matches,
        tournament.status === 'ACTIVE' ? new Date() : tournament.date,
        duration,
        tableCount
    );

    const currentPlayer = session?.user?.id ? players.find((p: any) => p.userId === session?.user?.id) : null;
    const waitTime = currentPlayer ? getEstimatedWaitTime(schedule, currentPlayer.id) : null;

    // Get tournament time forecast for active tournaments
    const forecast = tournament.status === 'ACTIVE' ? await getTournamentForecast(tournament.id) : null;

    const isHost = session?.user?.id === tournament.hostId;
    const yesRsvps = tournament.rsvps.filter((r: { status: string }) => r.status === 'YES');
    const yesCount = yesRsvps.length;
    const guestCount = tournament.guests.length;
    const totalParticipants = tournament.mode === 'TEAM' ? tournament.teams.length : (yesCount + guestCount);

    const isPlanned = tournament.status === 'PLANNED';
    const isActive = tournament.status === 'ACTIVE';
    const isCompleted = tournament.status === 'COMPLETED';
    const isTeamMode = tournament.mode === 'TEAM';

    // Check if it's a "Now" tournament (instant lobby)
    const isInstantTournament = new Date(tournament.date).getTime() - new Date(tournament.createdAt).getTime() < 1000 * 60 * 60;

    // Check if current user is the tournament winner
    const isCurrentUserWinner = (() => {
        if (!isCompleted || !currentPlayer) return false;
        const bracketMatches = tournament.matches.filter((m: any) => m.stage === 'BRACKET');
        if (bracketMatches.length === 0) return false;
        const maxRound = Math.max(...bracketMatches.map((m: any) => m.round));
        const finale = bracketMatches.find((m: any) => m.round === maxRound && m.position === 0);
        return finale?.winnerId === currentPlayer.id;
    })();

    // Available players for team assignment (those who RSVP'd YES)
    const availablePlayers = yesRsvps.map((r: any) => ({
        id: r.player.id,
        name: r.player.name,
        image: r.player.image
    }));

    return (
        <div className="container">
            {/* Client-side features: Wake Lock & Confetti */}
            <TournamentClientFeatures
                tournamentId={tournament.id}
                tournamentStatus={tournament.status}
                isWinner={isCurrentUserWinner}
            />

            <Link href="/tournaments" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-4)', display: 'inline-block' }}>
                &larr; Zurück
            </Link>

            {/* New Header with Mode Badges */}
            <TournamentHeader
                tournament={{
                    id: tournament.id,
                    name: tournament.name,
                    date: tournament.date,
                    location: tournament.location,
                    status: tournament.status,
                    mode: tournament.mode,
                    isRanked: tournament.isRanked,
                    type: tournament.type,
                    shortCode: tournament.shortCode
                }}
                participantCount={totalParticipants}
                isHost={isHost}
                showQR={isPlanned}
            />

            {/* Warnings */}
            {isPlanned && !isTeamMode && (tournament.type === 'ELIMINATION' || tournament.type === 'SINGLE_ELIMINATION') && yesCount % 2 !== 0 && yesCount > 0 && (
                <div className="glass-panel" style={{
                    padding: 'var(--spacing-3)',
                    marginBottom: 'var(--spacing-4)',
                    borderLeft: '4px solid orange',
                    background: 'rgba(255, 165, 0, 0.1)',
                    fontSize: '0.9rem'
                }}>
                    <strong style={{ color: 'orange' }}>⚠️ Ungerade Teilnehmerzahl</strong>
                    <span style={{ color: 'var(--color-text-dim)', marginLeft: 'var(--spacing-2)' }}>
                        Freilose werden automatisch generiert.
                    </span>
                </div>
            )}

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-6)' }}>

                {/* PLANNED: Lobby View */}
                {isPlanned && (
                    <>
                        {/* QR & Presence Row */}
                        <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                            <TournamentQRCode
                                tournamentId={tournament.id}
                                tournamentName={tournament.name}
                                shortCode={tournament.shortCode || undefined}
                            />
                            <LobbyPresence tournamentId={tournament.id} />
                        </div>

                        {/* Team Assignment (for TEAM mode) */}
                        {isTeamMode && (
                            <TeamAssignment
                                tournamentId={tournament.id}
                                teams={tournament.teams as any}
                                availablePlayers={availablePlayers}
                                availableGuests={tournament.guests}
                                isHost={isHost}
                            />
                        )}

                        {/* Participant List */}
                        <div className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
                            <h3 style={{ marginBottom: 'var(--spacing-3)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                {isTeamMode ? <Users size={18} /> : <User size={18} />}
                                {isTeamMode ? 'Spieler & Gäste' : 'Teilnehmer'} ({yesCount + guestCount})
                            </h3>

                            {(yesCount + guestCount) === 0 ? (
                                <p style={{ color: 'var(--color-text-dim)' }}>Noch keine Teilnehmer.</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                                    {/* Registered Players */}
                                    {yesRsvps.map((rsvp: any) => (
                                        <div key={rsvp.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-2)',
                                            padding: 'var(--spacing-2) var(--spacing-3)',
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-success)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '0.9rem'
                                        }}>
                                            {rsvp.player.image ? (
                                                <img src={rsvp.player.image} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white' }}>
                                                    {rsvp.player.name[0]}
                                                </div>
                                            )}
                                            {rsvp.player.name}
                                        </div>
                                    ))}

                                    {/* Guests */}
                                    {tournament.guests.map((guest: any) => (
                                        <div key={guest.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-2)',
                                            padding: 'var(--spacing-2) var(--spacing-3)',
                                            background: 'var(--color-surface)',
                                            border: '1px solid #9b59b6',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '0.9rem'
                                        }}>
                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#9b59b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white' }}>
                                                {guest.name[0]}
                                            </div>
                                            {guest.name}
                                            <span style={{ fontSize: '0.7rem', color: '#9b59b6' }}>Gast</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RSVP Form (for ranked tournaments only) */}
                        {tournament.isRanked && session?.user?.id && (
                            (() => {
                                const currentPlayer = players.find((p: any) => p.userId === session?.user?.id);
                                if (!currentPlayer) {
                                    return (
                                        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                            <p style={{ marginBottom: 'var(--spacing-2)' }}>Du hast noch kein Spielerprofil.</p>
                                            <Link href="/players/new" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>Profil erstellen</Link>
                                        </div>
                                    );
                                }
                                const userRsvp = tournament.rsvps.find((r: any) => r.playerId === currentPlayer.id);
                                const rsvpTitle = isInstantTournament ? "Beitreten" : "Bist du dabei?";
                                return <RSVPForm tournamentId={tournament.id} currentStatus={userRsvp?.status} title={rsvpTitle} />;
                            })()
                        )}

                        {/* Not logged in */}
                        {!session?.user?.id && tournament.isRanked && (
                            <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                <p style={{ marginBottom: 'var(--spacing-2)' }}>Zum Teilnehmen bitte einloggen.</p>
                                <Link href={`/login?callbackUrl=${encodeURIComponent(`/tournaments/${tournament.id}`)}`} className="btn btn-primary">Einloggen</Link>
                            </div>
                        )}

                        {/* Host Controls */}
                        {isHost && (
                            <div className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
                                <h3 style={{ marginBottom: 'var(--spacing-3)' }}>Host-Aktionen</h3>
                                <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
                                    <StartTournamentButton tournamentId={tournament.id} />
                                    <AdminDeleteButton id={tournament.id} type="Tournament" deleteAction={deleteTournament} />
                                </div>
                            </div>
                        )}

                        <AutoRefresh intervalMs={10000} />
                    </>
                )}

                {/* ACTIVE & COMPLETED: Tournament View */}
                {(isActive || isCompleted) && (
                    <>
                        {/* Tournament Summary (Completed) */}
                        {isCompleted && (
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

                        {/* Live Info Row */}
                        {isActive && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
                                {/* Forecast */}
                                {forecast && forecast.remainingMatches > 0 && (
                                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderLeft: '4px solid var(--color-secondary)' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-1)' }}>Geschätztes Ende</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{format(forecast.estimatedEndTime, 'HH:mm')} Uhr</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                            Noch {forecast.remainingMatches} Spiel{forecast.remainingMatches !== 1 ? 'e' : ''}
                                        </div>
                                    </div>
                                )}

                                {/* Wait Time */}
                                {waitTime && (
                                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderLeft: '4px solid var(--color-primary)' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-1)' }}>Dein nächstes Spiel</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>ca. {format(waitTime.startTime, 'HH:mm')} Uhr</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                            Tisch {waitTime.table} • ~{waitTime.waitMin} Min. Wartezeit
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Live Ticker */}
                        {isActive && <LiveTicker tournamentId={tournament.id} />}

                        {/* Tables for Round Robin / Groups */}
                        {tournament.type === 'ROUND_ROBIN' && (
                            <div>
                                <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Tabelle</h2>
                                <TournamentTable standings={await getTournamentStandings(tournament.id)} />
                            </div>
                        )}

                        {tournament.type === 'GROUPS' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-6)' }}>
                                <div>
                                    <h3 style={{ marginBottom: 'var(--spacing-3)', color: 'var(--color-primary)' }}>Gruppe A</h3>
                                    <TournamentTable standings={await getTournamentStandings(tournament.id, 'GROUP_1')} highlightTop={2} />
                                </div>
                                <div>
                                    <h3 style={{ marginBottom: 'var(--spacing-3)', color: 'var(--color-primary)' }}>Gruppe B</h3>
                                    <TournamentTable standings={await getTournamentStandings(tournament.id, 'GROUP_2')} highlightTop={2} />
                                </div>
                            </div>
                        )}

                        {/* Bracket */}
                        <div>
                            <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Bracket</h2>
                            {tournament.type !== 'SINGLE_ELIMINATION' && (
                                <GroupMatches matches={tournament.matches as any} />
                            )}
                            <Bracket matches={tournament.matches || []} />
                        </div>

                        {/* Host Controls */}
                        {isHost && isActive && (
                            <div className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
                                <h3 style={{ marginBottom: 'var(--spacing-3)' }}>Host-Aktionen</h3>
                                <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
                                    {(tournament.type === 'ROUND_ROBIN' || tournament.type === 'GROUPS') && (
                                        <StartPlayoffsButton tournamentId={tournament.id} />
                                    )}
                                    <FinishTournamentButton tournamentId={tournament.id} />
                                </div>
                            </div>
                        )}

                        {isActive && <AutoRefresh intervalMs={20000} />}
                    </>
                )}
            </div>
        </div>
    );
}
