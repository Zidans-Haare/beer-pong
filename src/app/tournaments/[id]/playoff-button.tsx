'use client';

import { startPlayoffs } from '@/app/actions/tournaments';

export default function StartPlayoffsButton({ tournamentId }: { tournamentId: string }) {
    async function onClick() {
        if (!confirm('Gruppenphase beenden und Finale generieren?')) return;

        const res = await startPlayoffs(tournamentId);
        if (!res.success) {
            alert(res.error);
        }
    }

    return (
        <button
            onClick={onClick}
            className="btn btn-primary"
            style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                color: 'black',
                fontWeight: 'bold',
                marginTop: 'var(--spacing-4)'
            }}
        >
            🏆 Finale Generieren
        </button>
    );
}
