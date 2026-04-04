'use client';

import { useTransition, useState, useEffect } from 'react';
import { setBringItem } from '@/app/actions/bring-list';
import { BRING_CATEGORIES } from '@/lib/bring-categories';
import { useRouter } from 'next/navigation';
import { Droplets, Table2, CupSoda, CircleDot, ShoppingBag, Minus, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BringItemData = { id: string; category: string; userId: string; userName: string; quantity: number };

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    BEER:   <Droplets  size={18} />,
    TABLES: <Table2    size={18} />,
    CUPS:   <CupSoda   size={18} />,
    BALLS:  <CircleDot size={18} />,
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

        // Optimistic update
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
        <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <ShoppingBag size={18} />
                {t('title')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {BRING_CATEGORIES.map(cat => {
                    const contributors = items.filter(i => i.category === cat.key);
                    const myItem = getMyItem(cat.key);
                    const totalQty = contributors.reduce((s, i) => s + i.quantity, 0);

                    return (
                        <div key={cat.key} style={{
                            padding: 'var(--spacing-3) var(--spacing-4)',
                            borderRadius: 'var(--radius-sm)',
                            background: myItem ? 'rgba(var(--color-primary-rgb, 99,102,241), 0.08)' : 'var(--color-surface)',
                            border: `1px solid ${myItem ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            transition: 'all 0.15s',
                        }}>
                            {/* Top row: icon + label + total + stepper */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                <span style={{ color: myItem ? 'var(--color-primary)' : 'var(--color-text-dim)', flexShrink: 0 }}>
                                    {CATEGORY_ICONS[cat.key]}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t(`categories.${cat.key}`)}</span>
                                    {totalQty > 0 && (
                                        <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                                            {totalQty}x
                                        </span>
                                    )}
                                </div>

                                {currentUserId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                        {myItem ? (
                                            <>
                                                <button
                                                    onClick={() => handleSet(cat.key, myItem.quantity - 1)}
                                                    disabled={isPending}
                                                    style={btnStyle}
                                                    title={t('less')}
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                                                    {myItem.quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleSet(cat.key, myItem.quantity + 1)}
                                                    disabled={isPending}
                                                    style={btnStyle}
                                                    title={t('more')}
                                                >
                                                    <Plus size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleSet(cat.key, 0)}
                                                    disabled={isPending}
                                                    style={{ ...btnStyle, marginLeft: '4px', borderColor: 'rgba(255,107,107,0.4)', color: 'var(--color-accent)' }}
                                                    title={t('remove')}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleSet(cat.key, 1)}
                                                disabled={isPending}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '6px 12px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid var(--color-border)',
                                                    background: 'transparent',
                                                    color: 'var(--color-text-dim)',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    cursor: isPending ? 'not-allowed' : 'pointer',
                                                    opacity: isPending ? 0.6 : 1,
                                                }}
                                            >
                                                <Plus size={13} /> {t('iWillBring')}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontStyle: 'italic', flexShrink: 0 }}>
                                        {t('loginRequired')}
                                    </span>
                                )}
                            </div>

                            {/* Contributors */}
                            {contributors.length > 0 && (
                                <div style={{ marginTop: 'var(--spacing-2)', paddingLeft: '30px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {contributors.map(c => (
                                        <span key={c.id} style={{
                                            fontSize: '0.78rem',
                                            color: c.userId === currentUserId ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                            background: c.userId === currentUserId ? 'rgba(var(--color-primary-rgb,99,102,241),0.1)' : 'rgba(255,255,255,0.04)',
                                            border: '1px solid ' + (c.userId === currentUserId ? 'rgba(var(--color-primary-rgb,99,102,241),0.3)' : 'var(--color-border)'),
                                            borderRadius: '100px',
                                            padding: '2px 8px',
                                        }}>
                                            {c.userName} · {c.quantity}x
                                        </span>
                                    ))}
                                </div>
                            )}
                            {contributors.length === 0 && (
                                <div style={{ marginTop: '4px', paddingLeft: '30px', fontSize: '0.8rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                                    {t('nobodyYet')}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-dim)',
    cursor: 'pointer',
    padding: 0,
};
