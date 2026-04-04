'use client';

import { useTransition, useState, useEffect } from 'react';
import { setBringItem } from '@/app/actions/bring-list';
import { BRING_CATEGORIES } from '@/lib/bring-categories';
import { useRouter } from 'next/navigation';
import { Droplets, Table2, CupSoda, CircleDot, ShoppingBag, Minus, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BringItemData = { id: string; category: string; userId: string; userName: string; quantity: number };

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    BEER:   <Droplets  size={16} />,
    TABLES: <Table2    size={16} />,
    CUPS:   <CupSoda   size={16} />,
    BALLS:  <CircleDot size={16} />,
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
        <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
            <h3 style={{
                marginBottom: 'var(--spacing-4)',
                fontSize: '1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
            }}>
                <ShoppingBag size={18} />
                {t('title')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                {BRING_CATEGORIES.map(cat => {
                    const contributors = items.filter(i => i.category === cat.key);
                    const myItem = getMyItem(cat.key);
                    const totalQty = contributors.reduce((s, i) => s + i.quantity, 0);

                    return (
                        <div key={cat.key} style={{
                            padding: 'var(--spacing-3) var(--spacing-4)',
                            borderRadius: 'var(--radius-md)',
                            background: myItem
                                ? 'rgba(var(--color-primary-rgb, 190, 35, 213), 0.05)'
                                : 'var(--color-surface-hover)',
                            border: `1px solid ${myItem ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            transition: 'border-color 0.2s, background 0.2s',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                {/* Icon */}
                                <span style={{ color: myItem ? 'var(--color-primary)' : 'var(--color-text-dim)', flexShrink: 0, display: 'flex' }}>
                                    {CATEGORY_ICONS[cat.key]}
                                </span>

                                {/* Label + total */}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', minWidth: 0 }}>
                                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                        {t(`categories.${cat.key}`)}
                                    </span>
                                    {totalQty > 0 && (
                                        <span style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            color: 'var(--color-primary)',
                                            background: 'rgba(var(--color-primary-rgb, 190, 35, 213), 0.1)',
                                            padding: '1px 7px',
                                            borderRadius: '99px',
                                        }}>
                                            {totalQty}×
                                        </span>
                                    )}
                                </div>

                                {/* Action */}
                                {currentUserId ? (
                                    myItem ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                            <button onClick={() => handleSet(cat.key, myItem.quantity - 1)} disabled={isPending} style={stepBtn} title={t('less')}>
                                                <Minus size={11} />
                                            </button>
                                            <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                                                {myItem.quantity}
                                            </span>
                                            <button onClick={() => handleSet(cat.key, myItem.quantity + 1)} disabled={isPending} style={stepBtn} title={t('more')}>
                                                <Plus size={11} />
                                            </button>
                                            <button
                                                onClick={() => handleSet(cat.key, 0)}
                                                disabled={isPending}
                                                style={{ ...stepBtn, marginLeft: '2px', borderColor: 'rgba(255,107,107,0.4)', color: 'var(--color-accent)' }}
                                                title={t('remove')}
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleSet(cat.key, 1)}
                                            disabled={isPending}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 10px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--color-border)',
                                                background: 'transparent',
                                                color: 'var(--color-text-dim)',
                                                fontSize: '0.8rem',
                                                fontWeight: 500,
                                                cursor: isPending ? 'not-allowed' : 'pointer',
                                                opacity: isPending ? 0.5 : 1,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Plus size={12} /> {t('iWillBring')}
                                        </button>
                                    )
                                ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontStyle: 'italic', flexShrink: 0 }}>
                                        {t('loginRequired')}
                                    </span>
                                )}
                            </div>

                            {/* Contributors */}
                            {contributors.length > 0 && (
                                <div style={{ marginTop: 'var(--spacing-2)', paddingLeft: '28px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {contributors.map(c => (
                                        <span key={c.id} style={{
                                            fontSize: '0.75rem',
                                            color: c.userId === currentUserId ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                            background: 'var(--color-surface)',
                                            border: `1px solid ${c.userId === currentUserId ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            borderRadius: '99px',
                                            padding: '1px 7px',
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
    width: '24px',
    height: '24px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-dim)',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
};
