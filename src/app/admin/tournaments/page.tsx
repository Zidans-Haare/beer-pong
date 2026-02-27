import { getPlannedTournaments, getRegisteredPlayers } from '@/app/actions/admin';
import { Trophy } from 'lucide-react';
import { AdminTournamentManager } from './AdminTournamentManager';

export default async function AdminTournamentsPage() {
    const [tournamentsResult, playersResult] = await Promise.all([
        getPlannedTournaments(),
        getRegisteredPlayers()
    ]);

    const tournaments = tournamentsResult.success ? tournamentsResult.tournaments ?? [] : [];
    const players = playersResult.success ? playersResult.players ?? [] : [];

    if (tournaments.length === 0) {
        return (
            <div className="card" style={{ maxWidth: '600px' }}>
                <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>
                    <Trophy size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                    Spieler zu Turnier anmelden
                </h2>
                <p style={{ color: 'var(--color-text-dim)' }}>
                    Keine geplanten Turniere vorhanden. Erstelle zuerst ein Turnier.
                </p>
            </div>
        );
    }

    return (
        <div className="card" style={{ maxWidth: '700px' }}>
            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-2)' }}>
                <Trophy size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                Spieler zu Turnier anmelden
            </h2>
            <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-6)', fontSize: '0.9rem' }}>
                Vergessliche Spieler manuell zu einem Turnier hinzufügen.
            </p>

            <AdminTournamentManager tournaments={tournaments} players={players} />
        </div>
    );
}
