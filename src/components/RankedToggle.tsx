'use client';

import { useRouter } from 'next/navigation';
import { Trophy, PartyPopper } from 'lucide-react';

export default function RankedToggle({ onlyRanked }: { onlyRanked: boolean }) {
    const router = useRouter();

    return (
        <div style={{
            display: 'inline-flex', padding: '4px',
            background: 'var(--color-surface)', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)', marginBottom: 'var(--spacing-6)'
        }}>
            <button
                onClick={() => router.push('/stats?ranked=true')}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: 'var(--radius-full)',
                    border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    background: onlyRanked ? 'var(--color-primary)' : 'transparent',
                    color: onlyRanked ? 'white' : 'var(--color-text-dim)',
                    transition: 'all 0.2s ease'
                }}
            >
                <Trophy size={14} /> Rangliste
            </button>
            <button
                onClick={() => router.push('/stats?ranked=false')}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: 'var(--radius-full)',
                    border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    background: !onlyRanked ? 'var(--color-primary)' : 'transparent',
                    color: !onlyRanked ? 'white' : 'var(--color-text-dim)',
                    transition: 'all 0.2s ease'
                }}
            >
                <PartyPopper size={14} /> Alles
            </button>
        </div>
    );
}
