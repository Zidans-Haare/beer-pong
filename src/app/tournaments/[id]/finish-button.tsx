'use client';

import { finishTournament } from '@/app/actions/tournaments';
import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import { useState } from 'react';

export default function FinishTournamentButton({ tournamentId }: { tournamentId: string }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleClick() {
        if (!confirm('Turnier wirklich abschließen? Es können dann keine Ergebnisse mehr eingetragen werden.')) return;

        setIsLoading(true);
        const res = await finishTournament(tournamentId);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.error);
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className="btn"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                background: 'rgba(39, 174, 96, 0.1)',
                border: '1px solid var(--color-success)',
                color: 'var(--color-success)',
                padding: 'var(--spacing-4)',
                fontWeight: 500,
                opacity: isLoading ? 0.7 : 1
            }}
        >
            <Flag size={20} />
            {isLoading ? 'Beendet...' : 'Turnier beenden'}
        </button>
    );
}
