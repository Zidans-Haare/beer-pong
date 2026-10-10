'use client';

import { startPlayoffs } from '@/app/actions/tournaments';
import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppDialog } from '@/components/AppDialog';

export default function StartPlayoffsButton({ tournamentId }: { tournamentId: string }) {
    const appDialog = useAppDialog();
    const t = useTranslations('tournaments');
    const [isLoading, setIsLoading] = useState(false);

    async function handleClick() {
        if (!await appDialog.confirm(t('confirmPlayoffs'), { title: t('startPlayoffs'), confirmLabel: t('startPlayoffs') })) return;

        setIsLoading(true);
        const res = await startPlayoffs(tournamentId);
        if (!res.success) {
            appDialog.alert(res.error);
        }
        setIsLoading(false);
    }

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className="btn btn-primary host-action-button"
        >
            <Trophy size={20} />
            {isLoading ? t('generatingPlayoffs') : t('startPlayoffs')}
        </button>
    );
}
