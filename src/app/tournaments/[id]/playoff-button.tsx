'use client';

import { startPlayoffs } from '@/app/actions/tournaments';
import { Trophy } from 'lucide-react';
import { useState } from 'react';

export default function StartPlayoffsButton({ tournamentId }: { tournamentId: string }) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleClick() {
        if (!confirm('Gruppenphase beenden und Finale generieren?')) return;

        setIsLoading(true);
        const res = await startPlayoffs(tournamentId);
        if (!res.success) {
            alert(res.error);
        }
        setIsLoading(false);
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
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                color: '#1a1a2e',
                fontWeight: 600,
                padding: 'var(--spacing-4)',
                border: 'none',
                opacity: isLoading ? 0.7 : 1
            }}
        >
            <Trophy size={20} />
            {isLoading ? 'Generiert...' : 'Finale starten'}
        </button>
    );
}
