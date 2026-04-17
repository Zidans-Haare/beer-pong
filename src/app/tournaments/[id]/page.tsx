import { getPlayers } from '@/app/actions/players';
import RSVPForm from './rsvp-form';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Bracket from '@/components/Bracket';
import TournamentTable from '@/components/TournamentTable';
import { getTournamentStandings } from '@/lib/stats';
import { LiveTicker } from '@/components/LiveTicker';
import { calculateSchedule, getEstimatedWaitTime } from '@/lib/scheduler';
import { getPublicSystemSettings } from '@/app/actions/admin';
import AutoRefresh from '@/components/AutoRefresh';
import TournamentSummary from '@/components/TournamentSummary';
import TournamentClientFeatures from '@/components/TournamentClientFeatures';
import { getTournamentForecast } from '@/lib/duration';
import TournamentHeader from '@/components/tournament/TournamentHeader';
import LiveStreamControl from './LiveStreamControl';
import TeamAssignment from '@/components/TeamAssignment';
import TeamList from '@/components/tournament/TeamList';
import ParticipantList from '@/components/tournament/ParticipantList';
import HostControls from '@/components/tournament/HostControls';
import PlayerProfilePrompt from '@/components/tournament/PlayerProfilePrompt';
import InstantTournamentInfo from '@/components/tournament/InstantTournamentInfo';
import LiveInfoCards from '@/components/tournament/LiveInfoCards';
import { ChevronRight, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';
import { isGuestForTournament } from '@/app/actions/guests';
import GuestStatusBadge from '@/components/tournament/GuestStatusBadge';
import GuestJoinForm from '@/app/join/[code]/GuestJoinForm';
import GroupMatches from '@/components/GroupMatches';

import TournamentSuccessModal from '@/components/tournament/TournamentSuccessModal';
import LobbyDurationWidget from '@/components/tournament/LobbyDurationWidget';
import { getTournamentTypeLabel } from '@/lib/tournament-utils';
import BringList from '@/components/tournament/BringList';
import { getBringItems } from '@/app/actions/bring-list';
import DrunkModeConditional from '@/components/DrunkModeConditional';
import GuestRoomInfo from '@/components/tournament/GuestRoomInfo';
import CostSplitWidget from '@/components/tournament/CostSplitWidget';

export default async function TournamentPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    noStore();
    const { id } = await params;
    const { newlyCreated } = await searchParams;
    const session = await auth();

    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            rsvps: { include: { player: true } },
            roomReservations: { include: { user: true } },
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
            },
            participants: {
                include: { player: { select: { userId: true } } }
            }
        }
    });

    if (!tournament) notFound();

    const t = await getTranslations('tournaments');
    const [players, systemSettings, bringItems] = await Promise.all([
        getPlayers(),
        getPublicSystemSettings(),
        getBringItems(id),
    ]);
    const duration = tournament.matchDurationMin || systemSettings.matchDurationMin || 15;
    const tableCount = tournament.tableCount || systemSettings.tableCount || 1;

    const schedule = calculateSchedule(
        tournament.matches,
        tournament.status === 'ACTIVE' ? new Date() : tournament.date,
        duration,
        tableCount
    );

    // Fetch PayPal URLs for all participants
    const participantUserIds = tournament.participants
        .map((p: any) => p.player?.userId)
        .filter(Boolean) as string[];

    const paypalUsers = participantUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: participantUserIds }, paypalMeUrl: { not: null } },
            select: { id: true, paypalMeUrl: true },
          })
        : [];
    const paypalHandles: Record<string, string> = Object.fromEntries(
        paypalUsers.map((u: any) => [u.id, u.paypalMeUrl as string])
    );

    const currentPlayer = session?.user?.id ? players.find((p: any) => p.userId === session?.user?.id) : null;
    const currentGuest = await isGuestForTournament(tournament.id);

    // If guest, find their temporary Player ID for wait time calculation
    let guestPlayerId = null;
    if (currentGuest) {
        const guestPlayerEntry = players.find((p: any) => p.name === currentGuest.name && p.isGuest);
        guestPlayerId = guestPlayerEntry?.id;
    }

    const waitTime = currentPlayer ? getEstimatedWaitTime(schedule, currentPlayer.id) : (guestPlayerId ? getEstimatedWaitTime(schedule, guestPlayerId) : null);
    const forecast = tournament.status === 'ACTIVE' ? await getTournamentForecast(tournament.id) : null;

    const isHost = session?.user?.id === tournament.hostId;
    const yesRsvps = tournament.rsvps.filter((r: { status: string }) => r.status === 'YES');
    const yesCount = yesRsvps.length;
    const guestCount = tournament.guests.length;
    const totalParticipants = tournament.mode === 'TEAM' ? tournament.teams.length : (yesCount + guestCount);

    // Get smart duration stats
    const { getGlobalDurationStats } = await import('@/lib/duration');
    const durationStats = await getGlobalDurationStats();
    const smartDuration = durationStats.isCalculated ? durationStats.averageMinutes : (tournament.matchDurationMin || systemSettings.matchDurationMin || 15);

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
        image: r.player.image,
        email: r.player.email
    }));

    const maybePlayers = tournament.rsvps
        .filter((r: { status: string }) => r.status === 'MAYBE')
        .map((r: any) => ({ id: r.player.id, name: r.player.name, image: r.player.image }));

    return (
        <div className="container" style={{ paddingBottom: '120px' }}>
            <TournamentClientFeatures
                tournamentId={tournament.id}
                tournamentStatus={tournament.status}
                isWinner={isCurrentUserWinner}
            />

            {newlyCreated === 'true' && (
                <TournamentSuccessModal
                    tournament={tournament}
                    participants={players.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        email: p.email || null
                    }))}
                />
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-6)', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                    href="/tournaments"
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
                    {t('allTournaments')}
                </Link>
            </div>

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
                    shortCode: tournament.shortCode,
                    hasReturnLeg: tournament.hasReturnLeg
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
                    <span>{t('oddParticipants')}</span>
                </div>
            )}

            {/* ============ PLANNED: Lobby ============ */}
            {isPlanned && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>

                    {/* Team Assignment */}
                    {isTeamMode && (
                        <>
                            <TeamAssignment
                                tournamentId={tournament.id}
                                teams={tournament.teams as any}
                                availablePlayers={availablePlayers}
                                availableGuests={tournament.guests}
                                isHost={isHost}
                            />

                            {/* Read-only Team List for everyone */}
                            <TeamList teams={tournament.teams as any} />
                        </>
                    )}

                    {/* Participants */}
                    <ParticipantList
                        players={availablePlayers}
                        maybePlayers={maybePlayers}
                        guests={tournament.guests}
                        isTeamMode={isTeamMode}
                    />

                    {/* Guest Status */}
                    {currentGuest && (
                        <GuestStatusBadge
                            guestId={currentGuest.id}
                            guestName={currentGuest.name}
                            tournamentId={tournament.id}
                            isPlanned={isPlanned}
                        />
                    )}

                    {/* RSVP Form */}
                    {session?.user?.id && (
                        (() => {
                            const player = players.find((p: any) => p.userId === session?.user?.id);
                            if (!player) {
                                return <PlayerProfilePrompt />;
                            }
                            const userRsvp = tournament.rsvps.find((r: any) => r.playerId === player.id);
                            return <RSVPForm tournamentId={tournament.id} currentStatus={userRsvp?.status} />;
                        })()
                    )}

                    {/* Not logged in - Nur bei geplanten Turnieren */}
                    {!session?.user?.id && (
                        tournament.isRanked ? (
                            <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                <p style={{ marginBottom: 'var(--spacing-2)' }}>{t('loginToJoin')}</p>
                                <Link href={`/login?callbackUrl=${encodeURIComponent(`/tournaments/${tournament.id}`)}`} className="btn btn-primary">
                                    {t('login')}
                                </Link>
                            </div>
                        ) : (
                            !currentGuest && (
                                <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
                                    <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: '1.2rem', textAlign: 'center' }}>{t('joinAsGuest')}</h3>
                                    <GuestJoinForm tournamentId={tournament.id} />
                                    <div style={{ marginTop: 'var(--spacing-6)', textAlign: 'center', fontSize: '0.9rem' }}>
                                        <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-2)' }}>{t('orLogin')}</p>
                                        <Link href={`/login?callbackUrl=${encodeURIComponent(`/tournaments/${tournament.id}`)}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                            {t('toLogin')}
                                        </Link>
                                    </div>
                                </div>
                            )
                        )
                    )}

                    {/* Sofort-Turnier: Info für eingeloggte User */}
                    <DrunkModeConditional show="sober">
                        {isInstantTournament && session?.user?.id && (
                            (() => {
                                const player = players.find((p: any) => p.userId === session?.user?.id);
                                if (!player) {
                                    return <PlayerProfilePrompt />;
                                }
                                const userRsvp = tournament.rsvps.find((r: any) => r.playerId === player.id);
                                return <InstantTournamentInfo isJoined={userRsvp?.status === 'YES'} />;
                            })()
                        )}

                        {!isInstantTournament && (
                            <>
                                <CostSplitWidget
                                    items={bringItems}
                                    participantCount={yesCount + guestCount}
                                    participantUserIds={participantUserIds}
                                    currentUserId={session?.user?.id ?? null}
                                    costPerPerson={(tournament as any).costPerPerson ?? null}
                                    isActive={isActive || isCompleted}
                                    paypalHandles={paypalHandles}
                                />
                                <BringList
                                    tournamentId={tournament.id}
                                    initialItems={bringItems}
                                    currentUserId={session?.user?.id ?? null}
                                />
                            </>
                        )}

                        {/* Guest Room Panel */}
                        {(tournament as any).offersGuestRoom && (
                            <GuestRoomInfo 
                                tournamentId={tournament.id}
                                title={(tournament as any).guestRoomTitle}
                                description={(tournament as any).guestRoomDescription}
                                capacity={(tournament as any).guestRoomCapacity}
                                image={(tournament as any).guestRoomImage}
                                offersBreakfast={(tournament as any).offersBreakfast}
                                offersHalfBoard={(tournament as any).offersHalfBoard}
                                reservations={(tournament as any).roomReservations || []}
                                isHost={isHost}
                                currentUserId={session?.user?.id}
                            />
                        )}

                        {/* Zusätzliche Infos – eingeklappt */}
                        <details style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', overflow: 'hidden' }}>
                            <summary style={{ padding: 'var(--spacing-3) var(--spacing-4)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-dim)', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', userSelect: 'none' }}>
                                <ChevronRight size={16} style={{ transition: 'transform 0.2s' }} />
                                {t('additionalInfo')}
                            </summary>
                            <div style={{ padding: 'var(--spacing-4)', borderTop: '1px solid var(--color-border)' }}>
                                <LobbyDurationWidget
                                    type={tournament.type}
                                    playerCount={totalParticipants}
                                    matchDurationMin={smartDuration}
                                    tableCount={tournament.tableCount || 1}
                                    hasReturnLeg={tournament.hasReturnLeg}
                                    startTime={tournament.date}
                                />
                            </div>
                        </details>
                    </DrunkModeConditional>

                    {/* Host Controls */}
                    {isHost && (
                        <HostControls
                            tournamentId={tournament.id}
                            tournamentType={tournament.type}
                            tournamentStatus={tournament.status}
                            isPlanned={isPlanned}
                            isActive={false}
                        />
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
                            tournamentType={getTournamentTypeLabel(tournament.type)}
                            standings={await prisma.tournamentStanding.findMany({
                                where: { tournamentId: tournament.id },
                                include: { player: true },
                                orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }]
                            })}
                            matches={tournament.matches}
                        />
                    )}

                    {/* Live Info Cards */}
                    <DrunkModeConditional show="sober">
                        {isActive && <LiveInfoCards forecast={forecast} waitTime={waitTime} />}
                    </DrunkModeConditional>

                    {/* Live Ticker */}
                    <DrunkModeConditional show="sober">
                        {isActive && <LiveTicker tournamentId={tournament.id} />}
                    </DrunkModeConditional>

                    {/* Tables */}
                    {tournament.type === 'ROUND_ROBIN' && (
                        <section style={{ marginTop: 'var(--spacing-8)' }}>
                            <h2 style={{ marginBottom: 'var(--spacing-3)', fontSize: '1.1rem', fontWeight: 600 }}>{t('tableSection')}</h2>
                            <TournamentTable
                                standings={await getTournamentStandings(tournament.id)}
                                label={isTeamMode ? 'Team' : t('playerLabel')}
                            />
                        </section>
                    )}

                    {tournament.type === 'GROUPS' && (
                        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-8)' }}>
                            <div>
                                <h3 style={{ marginBottom: 'var(--spacing-3)', color: 'var(--color-primary)', fontSize: '1rem', fontWeight: 600 }}>{t('groupA')}</h3>
                                <TournamentTable
                                    standings={await getTournamentStandings(tournament.id, 'GROUP_1')}
                                    highlightTop={2}
                                    label={isTeamMode ? 'Team' : t('playerLabel')}
                                />
                            </div>
                            <div>
                                <h3 style={{ marginBottom: 'var(--spacing-3)', color: 'var(--color-primary)', fontSize: '1rem', fontWeight: 600 }}>{t('groupB')}</h3>
                                <TournamentTable
                                    standings={await getTournamentStandings(tournament.id, 'GROUP_2')}
                                    highlightTop={2}
                                    label={isTeamMode ? 'Team' : t('playerLabel')}
                                />
                            </div>
                        </section>
                    )}

                    {/* Bracket */}
                    <section style={{ marginTop: 'var(--spacing-8)' }}>
                        <h2 style={{ marginBottom: 'var(--spacing-3)', fontSize: '1.1rem', fontWeight: 600 }}>Bracket</h2>
                        {tournament.type !== 'SINGLE_ELIMINATION' && (
                            <GroupMatches matches={schedule as any} tableCount={tableCount} />
                        )}
                        <Bracket matches={schedule as any} tableCount={tableCount} />
                    </section>

                    {/* Host Controls */}
                    {isHost && (
                        <HostControls
                            tournamentId={tournament.id}
                            tournamentType={tournament.type}
                            tournamentStatus={tournament.status}
                            isPlanned={false}
                            isActive={isActive}
                        />
                    )}

                    {isActive && <AutoRefresh intervalMs={20000} />}
                </div>
            )}
        </div>
    );
}
