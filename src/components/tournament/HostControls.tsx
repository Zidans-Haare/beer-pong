import StartTournamentButton from '@/app/tournaments/[id]/start-button';
import StartPlayoffsButton from '@/app/tournaments/[id]/playoff-button';
import FinishTournamentButton from '@/app/tournaments/[id]/finish-button';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { deleteTournament } from '@/app/actions/tournaments';

interface Props {
    tournamentId: string;
    tournamentType: string;
    tournamentStatus: string;
    isPlanned: boolean;
    isActive: boolean;
}

export default function HostControls({
    tournamentId,
    tournamentType,
    tournamentStatus,
    isPlanned,
    isActive
}: Props) {
    if (!isPlanned && !isActive) return null;

    return (
        <section className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: '1rem', fontWeight: 600 }}>Host-Aktionen</h3>
            <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
                {isPlanned && (
                    <>
                        <StartTournamentButton tournamentId={tournamentId} />
                        <AdminDeleteButton id={tournamentId} type="Tournament" deleteAction={deleteTournament} />
                    </>
                )}
                {isActive && (
                    <>
                        {(tournamentType === 'ROUND_ROBIN' || tournamentType === 'GROUPS') && (
                            <StartPlayoffsButton tournamentId={tournamentId} />
                        )}
                        <FinishTournamentButton tournamentId={tournamentId} />
                    </>
                )}
            </div>
        </section>
    );
}
