'use client';

import { finishTournament } from '@/app/actions/tournaments';
import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppDialog } from '@/components/AppDialog';

export default function FinishTournamentButton({ tournamentId }: { tournamentId: string }) {
    const appDialog = useAppDialog();
    const t = useTranslations('tournaments');
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleClick() {
        if (!await appDialog.confirm(t('confirmFinish'), { title: t('finishTournament'), confirmLabel: t('finishTournament') })) return;

        setIsLoading(true);
        const res = await finishTournament(tournamentId);
        if (res.success) {
            router.refresh();
        } else {
            appDialog.alert(res.error);
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className="btn btn-secondary host-action-button"
        >
            <Flag size={20} />
            {isLoading ? t('finishing') : t('finishTournament')}
        </button>
    );
}
