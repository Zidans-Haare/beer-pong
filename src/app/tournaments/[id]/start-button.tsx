'use client';

import { startTournament } from '@/app/actions/tournaments';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function StartTournamentButton({ tournamentId }: { tournamentId: string }) {
    const t = useTranslations('tournaments');
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
                width: '100%',
                padding: '0 var(--spacing-4)',
                height: '60px',
                fontSize: '1rem',
                fontWeight: 600,
                opacity: isLoading ? 0.7 : 1
            }}
        >
            <Play size={20} fill="currentColor" />
            {isLoading ? t('starting') : t('startTournament')}
        </button>
    );
}
