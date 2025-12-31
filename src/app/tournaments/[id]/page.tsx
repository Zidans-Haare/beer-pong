import { getTournament } from '@/app/actions/rsvp';
import { getPlayers } from '@/app/actions/players';
import RSVPForm from './rsvp-form';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import StartTournamentButton from './start-button';
import StartPlayoffsButton from './playoff-button';
import Bracket from '@/components/Bracket';
import TournamentTable from '@/components/TournamentTable';
import { getTournamentStandings } from '@/lib/stats';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { deleteTournament } from '@/app/actions/tournaments';
import FinishTournamentButton from './finish-button';

export const dynamic = 'force-dynamic';

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const tournament = await getTournament(id);
    const players = await getPlayers();

    if (!tournament) {
        notFound();
    }

    const yesCount = tournament.rsvps.filter((r) => r.status === 'YES').length;
    const isPlanner = tournament.status === 'PLANNED';
    const isActive = tournament.status === 'ACTIVE' || tournament.status === 'COMPLETED';

    // Need to fetch matches? getTournament included them?
    // I need to update getTournament in `src/app/actions/rsvp.ts` to include matches

    // ... imports

    return (
        <div className="container">
            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--spacing-2)' }}>{tournament.name}</h1>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        {isActive && <FinishTournamentButton tournamentId={tournament.id} />}
                        <AdminDeleteButton id={tournament.id} type="Tournament" deleteAction={deleteTournament} />
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-6)', color: 'var(--color-text-dim)' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-8)' }}>
                <div>
                    <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Teilnehmerliste</h2>
                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
                        {tournament.rsvps.filter(r => r.status === 'YES').length === 0 ? (
                            <p style={{ color: 'var(--color-text-dim)' }}>Noch keine Zusagen.</p>
                        ) : (
                            <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--spacing-2)' }}>
                                {tournament.rsvps.filter(r => r.status === 'YES').map((rsvp) => (
                                    <li key={rsvp.id} style={{ padding: 'var(--spacing-2)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                        {rsvp.player.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Absagen toggle or something could go here */}
                </div>

                <aside>
                    {isPlanner && (
                        <RSVPForm tournamentId={tournament.id} players={players} currentRsvps={tournament.rsvps} />
                    )}
                </aside>
            </div>

            {isActive && (
                <div style={{ marginTop: 'var(--spacing-12)' }}>
                    {tournament.type === 'ROUND_ROBIN' && (
                        <>
                            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>Tabelle</h2>
                            <TournamentTable standings={await getTournamentStandings(tournament.id)} />

                            {/* Check if playoffs already exist (round 99) */}
                            {(!tournament.matches.some(m => m.round === 99)) && (
                                <div style={{ marginBottom: 'var(--spacing-8)', textAlign: 'center' }}>
                                    <StartPlayoffsButton tournamentId={tournament.id} />
                                </div>
                            )}
                        </>
                    )}

                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>Spiele / Turnierbaum</h2>
                    <Bracket matches={tournament.matches || []} />
                </div>
            )}
        </div>
    );
}
