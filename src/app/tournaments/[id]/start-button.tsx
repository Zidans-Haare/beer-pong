'use client';

import { startTournament } from '@/app/actions/tournaments';
import { Play } from 'lucide-react';
import { useState } from 'react';

export default function StartTournamentButton({ tournamentId }: { tournamentId: string }) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleStart() {
        setIsLoading(true);
        const res = await startTournament(tournamentId);
        if (!res.success) {
            alert(res.error);
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleStart}
            disabled={isLoading}
            className="btn btn-primary"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: 'var(--spacing-3) var(--spacing-5)',
                fontSize: '1rem',
                fontWeight: 600,
                opacity: isLoading ? 0.7 : 1
            }}
        >
            <Play size={18} fill="currentColor" />
            {isLoading ? 'Startet...' : 'Turnier starten'}
        </button>
    );
}
