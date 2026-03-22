'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaveTournamentAsGuest } from '@/app/actions/guests';
import { UserCheck, LogOut, Loader2 } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { useTranslations } from 'next-intl';

interface Props {
    guestId: string;
    guestName: string;
    tournamentId: string;
    isPlanned: boolean;
}

export default function GuestStatusBadge({ guestId, guestName, tournamentId, isPlanned }: Props) {
    const t = useTranslations('guest');
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLeave = async () => {
        if (!isPlanned) {
            alert(t('cantLeave'));
            return;
        }
        if (!confirm(t('confirmLeave'))) return;

        setLoading(true);
        haptic.light();

        try {
            const result = await leaveTournamentAsGuest(guestId, tournamentId);
            if (result.success) {
                haptic.success();
                router.refresh();
                // Optional: redirect to home or keep on page to show join button
            } else {
                alert(result.error || t('leaveError'));
                haptic.error();
            }
        } catch (error) {
            console.error(error);
            haptic.error();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{
            padding: 'var(--spacing-4)',
            background: 'rgba(155, 89, 182, 0.1)',
            border: '1px solid rgba(155, 89, 182, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-3)',
            marginBottom: 'var(--spacing-4)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#9b59b6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}>
                    <UserCheck size={18} />
                </div>
                <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                        {t('signedIn')}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 0 }}>
                        {guestName}
                    </p>
                </div>
            </div>

            <button
                onClick={handleLeave}
                disabled={loading}
                style={{
                    background: 'rgba(231, 76, 60, 0.15)',
                    border: '1px solid #e74c3c',
                    color: '#e74c3c',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                {t('leave')}
            </button>
        </div>
    );
}
