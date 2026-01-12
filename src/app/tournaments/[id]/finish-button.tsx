'use client';

import { finishTournament } from '@/app/actions/tournaments';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function FinishTournamentButton({ tournamentId }: { tournamentId: string }) {
    const router = useRouter();

    async function onClick() {
        if (!confirm('Turnier wirklich abschließen? Es können dann keine Ergebnisse mehr eingetragen werden.')) return;

        const res = await finishTournament(tournamentId);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.error);
        }
    }

    return (
        <button
            onClick={onClick}
            className="btn"
            style={{
                border: '1px solid var(--color-success)',
                color: 'var(--color-success)',
                marginTop: 'var(--spacing-4)',
                float: 'right',
                gap: '8px'
            }}
        >
            <CheckCircle size={18} /> Turnier Abschließen
        </button>
    );
}
