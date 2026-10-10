'use client';

import { startTournament } from '@/app/actions/tournaments';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppDialog } from '@/components/AppDialog';

export default function StartTournamentButton({ tournamentId }: { tournamentId: string }) {
    const appDialog = useAppDialog();
    const t = useTranslations('tournaments');
    const [isLoading, setIsLoading] = useState(false);

    async function handleStart() {
        setIsLoading(true);
        const res = await startTournament(tournamentId);
        if (!res.success) {
            appDialog.alert(res.error);
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleStart}
            disabled={isLoading}
            className="btn btn-primary host-action-button"
        >
            <Play size={20} fill="currentColor" />
            {isLoading ? t('starting') : t('startTournament')}
        </button>
    );
}
