'use client';

import { useTransition, useState, useEffect } from 'react';
import { setBringItem } from '@/app/actions/bring-list';
import { BRING_CATEGORIES } from '@/lib/bring-categories';
import { useRouter } from 'next/navigation';
import { Droplets, Table2, CupSoda, CircleDot, ShoppingBag, Minus, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BringItemData = { id: string; category: string; userId: string; userName: string; quantity: number };

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    BEER:   <Droplets  size={14} />,
    TABLES: <Table2    size={14} />,
    CUPS:   <CupSoda   size={14} />,
    BALLS:  <CircleDot size={14} />,
};

export default function BringList({
    tournamentId,
    initialItems,
    currentUserId,
}: {
    tournamentId: string;
    initialItems: BringItemData[];
    currentUserId: string | null;
}) {
    const t = useTranslations('bringList');
    const [items, setItems] = useState<BringItemData[]>(initialItems);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    function getMyItem(category: string) {
        return items.find(i => i.category === category && i.userId === currentUserId);
    }

    function handleSet(category: string, quantity: number) {
        if (!currentUserId || isPending) return;

        setItems(prev => {
            const without = prev.filter(i => !(i.category === category && i.userId === currentUserId));
            if (quantity <= 0) return without;
            const existing = prev.find(i => i.category === category && i.userId === currentUserId);
            return [...without, {
                id: existing?.id ?? `opt-${Date.now()}`,
                category,
                userId: currentUserId,
                userName: t('you'),
                quantity,
            }];
        });

        startTransition(async () => {
            await setBringItem(tournamentId, category, quantity);
            router.refresh();
        });
    }

    return (
        <div>
            {/* Section label */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: 'var(--spacing-3)',
                color: 'var(--color-text-dim)',
            }}>
                <ShoppingBag size={13} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('title')}
                </span>
            </div>

            {/* 2×2 compact grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)' }}>
                {BRING_CATEGORIES.map(cat => {
                    const contributors = items.filter(i => i.category === cat.key);
                    const myItem = getMyItem(cat.key);
                    const totalQty = contributors.reduce((s, i) => s + i.quantity, 0);

                    return (
                        <div key={cat.key} style={{
                            padding: 'var(--spacing-3)',
                            borderRadius: 'var(--radius-md)',
                            background: myItem
                                ? 'rgba(var(--color-primary-rgb, 190, 35, 213), 0.05)'
                                : 'var(--color-surface-hover)',
                            border: `1px solid ${myItem ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            transition: 'border-color 0.2s, background 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-2)',
                        }}>
                            {/* Row: icon + label + total */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: myItem ? 'var(--color-primary)' : 'var(--color-text-dim)', display: 'flex', flexShrink: 0 }}>
                                    {CATEGORY_ICONS[cat.key]}
                                </span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t(`categories.${cat.key}`)}
                                </span>
                                {totalQty > 0 && (
                                    <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: 'var(--color-primary)',
                                        background: 'rgba(var(--color-primary-rgb, 190, 35, 213), 0.1)',
                                        padding: '1px 5px',
                                        borderRadius: '99px',
                                        flexShrink: 0,
                                    }}>
                                        {totalQty}×
                                    </span>
                                )}
                            </div>

                            {/* Action row */}
                            {currentUserId ? (
                                myItem ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <button onClick={() => handleSet(cat.key, myItem.quantity - 1)} disabled={isPending} style={stepBtn} title={t('less')}>
                                            <Minus size={10} />
                                        </button>
                                        <span style={{ minWidth: '16px', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                                            {myItem.quantity}
                                        </span>
                                        <button onClick={() => handleSet(cat.key, myItem.quantity + 1)} disabled={isPending} style={stepBtn} title={t('more')}>
                                            <Plus size={10} />
                                        </button>
                                        <button
                                            onClick={() => handleSet(cat.key, 0)}
                                            disabled={isPending}
                                            style={{ ...stepBtn, marginLeft: 'auto', borderColor: 'rgba(255,107,107,0.4)', color: 'var(--color-accent)' }}
                                            title={t('remove')}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleSet(cat.key, 1)}
                                        disabled={isPending}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '3px',
                                            padding: '3px 0',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px dashed var(--color-border)',
                                            background: 'transparent',
                                            color: 'var(--color-text-dim)',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            cursor: isPending ? 'not-allowed' : 'pointer',
                                            opacity: isPending ? 0.5 : 1,
                                            width: '100%',
                                        }}
                                    >
                                        <Plus size={11} /> {t('iWillBring')}
                                    </button>
                                )
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                                    {t('loginRequired')}
                                </span>
                            )}

                            {/* Contributors */}
                            {contributors.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                    {contributors.map(c => (
                                        <span key={c.id} style={{
                                            fontSize: '0.7rem',
                                            color: c.userId === currentUserId ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                            background: 'var(--color-surface)',
                                            border: `1px solid ${c.userId === currentUserId ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            borderRadius: '99px',
                                            padding: '1px 6px',
                                        }}>
                                            {c.userName} · {c.quantity}×
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const stepBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-dim)',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
};
