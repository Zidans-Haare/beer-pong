'use client';

import StartTournamentButton from '@/app/tournaments/[id]/start-button';
import StartPlayoffsButton from '@/app/tournaments/[id]/playoff-button';
import FinishTournamentButton from '@/app/tournaments/[id]/finish-button';
import { deleteTournament } from '@/app/actions/tournaments';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppDialog } from '@/components/AppDialog';

interface Props {
    tournamentId: string;
    tournamentType: string;
    tournamentStatus: string;
    isPlanned: boolean;
    isActive: boolean;
}

export default function HostControls({
    tournamentId,
    tournamentType,
    tournamentStatus,
    isPlanned,
    isActive
}: Props) {
    const appDialog = useAppDialog();
    const t = useTranslations('host');
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isPlanned && !isActive) return null;

    async function handleDelete() {
        if (!await appDialog.confirm(t('confirm'), { title: t('delete'), confirmLabel: t('delete'), danger: true })) return;
        setIsDeleting(true);
        const res = await deleteTournament(tournamentId);
        if (res.success) {
            router.push('/tournaments');
            router.refresh();
        } else {
            appDialog.alert(res.error || t('deleteError'));
            setIsDeleting(false);
        }
    }

    const showPlayoffs = tournamentType === 'ROUND_ROBIN' || tournamentType === 'GROUPS';

    return (
        <section className="glass-panel host-actions" aria-label={t('title')}>
            <h3 className="host-actions-title">{t('title')}</h3>
            <div className="host-actions-grid">
                {isPlanned && (
                    <>
                        <div className="host-action">
                            <StartTournamentButton tournamentId={tournamentId} />
                            <p>{t('startHint')}</p>
                        </div>
                        <div className="host-action">
                            <button type="button" onClick={handleDelete} disabled={isDeleting} className="btn btn-danger host-action-button">
                                <Trash2 size={20} aria-hidden="true" />
                                {isDeleting ? t('deleting') : t('delete')}
                            </button>
                            <p>{t('deleteHint')}</p>
                        </div>
                    </>
                )}
                {isActive && (
                    <>
                        {showPlayoffs && (
                            <div className="host-action">
                                <StartPlayoffsButton tournamentId={tournamentId} />
                                <p>{t('playoffsHint')}</p>
                            </div>
                        )}
                        <div className="host-action">
                            <FinishTournamentButton tournamentId={tournamentId} />
                            <p>{t('finishHint')}</p>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
