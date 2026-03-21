'use client';

import StartTournamentButton from '@/app/tournaments/[id]/start-button';
import StartPlayoffsButton from '@/app/tournaments/[id]/playoff-button';
import FinishTournamentButton from '@/app/tournaments/[id]/finish-button';
import { deleteTournament } from '@/app/actions/tournaments';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('host');
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isPlanned && !isActive) return null;

    async function handleDelete() {
        if (!confirm(t('confirm'))) return;
        setIsDeleting(true);
        const res = await deleteTournament(tournamentId);
        if (res.success) {
            router.push('/tournaments');
            router.refresh();
        } else {
            alert(res.error || 'Fehler beim Löschen');
            setIsDeleting(false);
        }
    }

    return (
        <section className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: '1rem', fontWeight: 600 }}>{t('title')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-3)' }}>
                {isPlanned && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                        <StartTournamentButton tournamentId={tournamentId} />

                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="btn"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid var(--color-error)',
                                color: 'var(--color-error)',
                                padding: '0 var(--spacing-4)',
                                height: '60px',
                                fontSize: '1rem',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                opacity: isDeleting ? 0.7 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            <Trash2 size={20} />
                            {isDeleting ? t('deleting') : t('delete')}
                        </button>
                    </div>
                )}
                {isActive && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-3)' }}>
                        {(tournamentType === 'ROUND_ROBIN' || tournamentType === 'GROUPS') && (
                            <StartPlayoffsButton tournamentId={tournamentId} />
                        )}
                        <FinishTournamentButton tournamentId={tournamentId} />
                    </div>
                )}
            </div>
        </section>
    );
}
