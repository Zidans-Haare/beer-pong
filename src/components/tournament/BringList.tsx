'use client';

import { useTransition, useState } from 'react';
import { toggleBringItem } from '@/app/actions/bring-list';
import { BRING_CATEGORIES } from '@/lib/bring-categories';
import { useRouter } from 'next/navigation';

type BringItemData = { id: string; category: string; userId: string; userName: string };

export default function BringList({
    tournamentId,
    initialItems,
    currentUserId,
}: {
    tournamentId: string;
    initialItems: BringItemData[];
    currentUserId: string | null;
}) {
    const [items, setItems] = useState<BringItemData[]>(initialItems);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    function handleToggle(category: string) {
        if (!currentUserId || isPending) return;

        const existing = items.find(i => i.category === category && i.userId === currentUserId);

        // Optimistic update
        if (existing) {
            setItems(prev => prev.filter(i => i.id !== existing.id));
        } else {
            const optimistic: BringItemData = {
                id: `opt-${Date.now()}`,
                category,
                userId: currentUserId,
                userName: 'Du',
            };
            setItems(prev => [...prev, optimistic]);
        }

        startTransition(async () => {
            await toggleBringItem(tournamentId, category);
            router.refresh();
        });
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                📦 Mitbringliste
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {BRING_CATEGORIES.map(cat => {
                    const contributors = items.filter(i => i.category === cat.key);
                    const isMine = contributors.some(i => i.userId === currentUserId);

                    return (
                        <div
                            key={cat.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-3)',
                                padding: 'var(--spacing-3) var(--spacing-4)',
                                borderRadius: 'var(--radius-sm)',
                                background: isMine
                                    ? 'rgba(var(--color-primary-rgb, 99,102,241), 0.12)'
                                    : 'var(--color-surface)',
                                border: `1px solid ${isMine ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                transition: 'all 0.15s',
                            }}
                        >
                            {/* Emoji + label */}
                            <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cat.label}</div>
                                {contributors.length > 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                                        {contributors.map(c => c.userName).join(', ')}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '2px', fontStyle: 'italic' }}>
                                        Noch niemand
                                    </div>
                                )}
                            </div>

                            {/* Toggle button */}
                            {currentUserId ? (
                                <button
                                    onClick={() => handleToggle(cat.key)}
                                    disabled={isPending}
                                    style={{
                                        flexShrink: 0,
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${isMine ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        background: isMine ? 'var(--color-primary)' : 'transparent',
                                        color: isMine ? '#fff' : 'var(--color-text-dim)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                        opacity: isPending ? 0.6 : 1,
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {isMine ? '✓ Ich' : '+ Ich'}
                                </button>
                            ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontStyle: 'italic', flexShrink: 0 }}>
                                    Login nötig
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
