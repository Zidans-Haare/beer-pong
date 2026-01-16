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
import TournamentClientFeatures from '@/components/TournamentClientFeatures';
import { getTournamentForecast } from '@/lib/duration';
import TournamentHeader from '@/components/tournament/TournamentHeader';
import TeamAssignment from '@/components/TeamAssignment';
import { Users, User, Clock, Target, ChevronRight, Zap } from 'lucide-react';

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

    const isInstantTournament = new Date(tournament.date).getTime() - new Date(tournament.createdAt).getTime() < 1000 * 60 * 60;

    const isCurrentUserWinner = (() => {
        if (!isCompleted || !currentPlayer) return false;
        const bracketMatches = tournament.matches.filter((m: any) => m.stage === 'BRACKET');
        if (bracketMatches.length === 0) return false;
        const maxRound = Math.max(...bracketMatches.map((m: any) => m.round));
        const finale = bracketMatches.find((m: any) => m.round === maxRound && m.position === 0);
        return finale?.winnerId === currentPlayer.id;
    })();

    const availablePlayers = yesRsvps.map((r: any) => ({
        id: r.player.id,
        name: r.player.name,
        image: r.player.image
    }));

    return (
        <div className="container" style={{ paddingBottom: '120px' }}>
            <TournamentClientFeatures
                tournamentId={tournament.id}
                tournamentStatus={tournament.status}
                isWinner={isCurrentUserWinner}
            />

            <Link
                href="/tournaments"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: 'var(--spacing-4)',
                    color: 'var(--color-text-dim)',
                    fontSize: '0.9rem',
                    textDecoration: 'none'
                }}
            >
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                Alle Turniere
            </Link>

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

            {/* Warning: Odd participants */}
            {isPlanned && !isTeamMode && (tournament.type === 'ELIMINATION' || tournament.type === 'SINGLE_ELIMINATION') && yesCount % 2 !== 0 && yesCount > 0 && (
                <div style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    marginBottom: 'var(--spacing-4)',
                    background: 'rgba(255, 165, 0, 0.08)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)'
                }}>
                    <Zap size={16} color="orange" />
                    <span><strong style={{ color: 'orange' }}>Ungerade Teilnehmerzahl</strong> – Freilose werden automatisch vergeben</span>
                </div>
            )}

            {/* ============ PLANNED: Lobby ============ */}
            {isPlanned && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>

                    {/* Team Assignment */}
                    {isTeamMode && (
                        <TeamAssignment
                            tournamentId={tournament.id}
                            teams={tournament.teams as any}
                            availablePlayers={availablePlayers}
                            availableGuests={tournament.guests}
                            isHost={isHost}
                        />
                    )}

                    {/* Participants */}
                    <section className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
                        <h3 style={{
                            marginBottom: 'var(--spacing-4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}>
                            {isTeamMode ? <Users size={18} /> : <User size={18} />}
                            {isTeamMode ? 'Verfügbare Spieler' : 'Teilnehmer'}
                            <span style={{
                                marginLeft: 'auto',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: 'var(--color-text-dim)',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '2px 8px',
                                borderRadius: '99px'
                            }}>
                                {yesCount + guestCount}
                            </span>
                        </h3>

                        {(yesCount + guestCount) === 0 ? (
                            <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: 'var(--spacing-4)' }}>
                                Noch keine Teilnehmer. Teile den Link!
                            </p>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: 'var(--spacing-2)'
                            }}>
                                {yesRsvps.map((rsvp: any) => (
                                    <div key={rsvp.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-2)',
                                        padding: 'var(--spacing-2) var(--spacing-3)',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.85rem'
                                    }}>
                                        {rsvp.player.image ? (
                                            <img
                                                src={rsvp.player.image}
                                                alt=""
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    border: '2px solid var(--color-border)'
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: 'white'
                                            }}>
                                                {rsvp.player.name[0].toUpperCase()}
                                            </div>
                                        )}
                                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {rsvp.player.name}
                                        </span>
                                    </div>
                                ))}

                                {tournament.guests.map((guest: any) => (
                                    <div key={guest.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-2)',
                                        padding: 'var(--spacing-2) var(--spacing-3)',
                                        background: 'rgba(155, 89, 182, 0.08)',
                                        border: '1px solid rgba(155, 89, 182, 0.3)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.85rem'
                                    }}>
                                        <div style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            background: '#9b59b6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: 'white'
                                        }}>
                                            {guest.name[0].toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {guest.name}
                                        </span>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            color: '#9b59b6',
                                            marginLeft: 'auto'
                                        }}>
                                            GAST
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* RSVP Form */}
                    {tournament.isRanked && session?.user?.id && (
                        (() => {
                            const player = players.find((p: any) => p.userId === session?.user?.id);
                            if (!player) {
                                return (
                                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                        <p style={{ marginBottom: 'var(--spacing-2)' }}>Du hast noch kein Spielerprofil.</p>
                                        <Link href="/players/new" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>Profil erstellen</Link>
                                    </div>
                                );
                            }
                            const userRsvp = tournament.rsvps.find((r: any) => r.playerId === player.id);
                            return <RSVPForm tournamentId={tournament.id} currentStatus={userRsvp?.status} title={isInstantTournament ? "Beitreten" : "Bist du dabei?"} />;
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
                        <section className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
                            <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: '1rem', fontWeight: 600 }}>Host-Aktionen</h3>
                            <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
                                <StartTournamentButton tournamentId={tournament.id} />
                                <AdminDeleteButton id={tournament.id} type="Tournament" deleteAction={deleteTournament} />
                            </div>
                        </section>
                    )}

                    <AutoRefresh intervalMs={10000} />
                </div>
            )}

            {/* ============ ACTIVE & COMPLETED ============ */}
            {(isActive || isCompleted) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>

                    {/* Summary (completed) */}
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

                    {/* Live Info Cards */}
                    {isActive && ((forecast?.remainingMatches ?? 0) > 0 || waitTime) && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: 'var(--spacing-3)'
                        }}>
                            {forecast && forecast.remainingMatches > 0 && (
                                <div style={{
                                    padding: 'var(--spacing-4)',
                                    background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(78, 205, 196, 0.02) 100%)',
                                    border: '1px solid rgba(78, 205, 196, 0.3)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
                                        <Clock size={14} color="var(--color-secondary)" />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ende</span>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{format(forecast.estimatedEndTime, 'HH:mm')}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                        {forecast.remainingMatches} {forecast.remainingMatches === 1 ? 'Spiel' : 'Spiele'} übrig
                                    </div>
                                </div>
                            )}

                            {waitTime && (
                                <div style={{
                                    padding: 'var(--spacing-4)',
                                    background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.02) 100%)',
                                    border: '1px solid rgba(255, 107, 107, 0.3)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
                                        <Target size={14} color="var(--color-primary)" />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dein Spiel</span>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>~{format(waitTime.startTime, 'HH:mm')}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                        Tisch {waitTime.table} • {waitTime.waitMin} Min.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Live Ticker */}
                    {isActive && <LiveTicker tournamentId={tournament.id} />}

                    {/* Tables */}
                    {tournament.type === 'ROUND_ROBIN' && (
                        <section>
                            <h2 style={{ marginBottom: 'var(--spacing-3)', fontSize: '1.1rem', fontWeight: 600 }}>Tabelle</h2>
                            <TournamentTable standings={await getTournamentStandings(tournament.id)} />
                        </section>
                    )}

                    {tournament.type === 'GROUPS' && (
                        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-4)' }}>
                            <div>
                                <h3 style={{ marginBottom: 'var(--spacing-3)', color: 'var(--color-primary)', fontSize: '1rem', fontWeight: 600 }}>Gruppe A</h3>
                                <TournamentTable standings={await getTournamentStandings(tournament.id, 'GROUP_1')} highlightTop={2} />
                            </div>
                            <div>
                                <h3 style={{ marginBottom: 'var(--spacing-3)', color: 'var(--color-primary)', fontSize: '1rem', fontWeight: 600 }}>Gruppe B</h3>
                                <TournamentTable standings={await getTournamentStandings(tournament.id, 'GROUP_2')} highlightTop={2} />
                            </div>
                        </section>
                    )}

                    {/* Bracket */}
                    <section>
                        <h2 style={{ marginBottom: 'var(--spacing-3)', fontSize: '1.1rem', fontWeight: 600 }}>Bracket</h2>
                        {tournament.type !== 'SINGLE_ELIMINATION' && (
                            <GroupMatches matches={tournament.matches as any} />
                        )}
                        <Bracket matches={tournament.matches || []} />
                    </section>

                    {/* Host Controls */}
                    {isHost && isActive && (
                        <section className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
                            <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: '1rem', fontWeight: 600 }}>Host-Aktionen</h3>
                            <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
                                {(tournament.type === 'ROUND_ROBIN' || tournament.type === 'GROUPS') && (
                                    <StartPlayoffsButton tournamentId={tournament.id} />
                                )}
                                <FinishTournamentButton tournamentId={tournament.id} />
                            </div>
                        </section>
                    )}

                    {isActive && <AutoRefresh intervalMs={20000} />}
                </div>
            )}
        </div>
    );
}
