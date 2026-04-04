'use client';

import { useTransition, useState, useEffect } from 'react';
import { setBringItem } from '@/app/actions/bring-list';
import { BRING_CATEGORIES } from '@/lib/bring-categories';
import { useRouter } from 'next/navigation';
import { Droplets, Table2, CupSoda, CircleDot, ShoppingBag, Minus, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BringItemData = { id: string; category: string; userId: string; userName: string; quantity: number };

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    BEER:   <Droplets  size={20} />,
    TABLES: <Table2    size={20} />,
    CUPS:   <CupSoda   size={20} />,
    BALLS:  <CircleDot size={20} />,
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
    BEER:   { bg: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.03) 100%)',  border: 'rgba(251,191,36,0.35)',  icon: '#f59e0b' },
    TABLES: { bg: 'linear-gradient(135deg, rgba(78,205,196,0.12) 0%, rgba(78,205,196,0.03) 100%)',  border: 'rgba(78,205,196,0.35)',  icon: 'var(--color-secondary)' },
    CUPS:   { bg: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.03) 100%)',  border: 'rgba(59,130,246,0.35)',  icon: '#3b82f6' },
    BALLS:  { bg: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0.03) 100%)',  border: 'rgba(249,115,22,0.35)',  icon: '#f97316' },
};

const CATEGORY_COLORS_ACTIVE: Record<string, { bg: string; border: string }> = {
    BEER:   { bg: 'linear-gradient(135deg, rgba(251,191,36,0.22) 0%, rgba(251,191,36,0.08) 100%)',  border: 'rgba(251,191,36,0.6)' },
    TABLES: { bg: 'linear-gradient(135deg, rgba(78,205,196,0.22) 0%, rgba(78,205,196,0.08) 100%)',  border: 'rgba(78,205,196,0.6)' },
    CUPS:   { bg: 'linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.08) 100%)',  border: 'rgba(59,130,246,0.6)' },
    BALLS:  { bg: 'linear-gradient(135deg, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0.08) 100%)',  border: 'rgba(249,115,22,0.6)' },
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
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
            }}>
                <ShoppingBag size={18} />
                {t('title')}
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--spacing-3)',
            }}>
                {BRING_CATEGORIES.map(cat => {
                    const contributors = items.filter(i => i.category === cat.key);
                    const myItem = getMyItem(cat.key);
                    const totalQty = contributors.reduce((s, i) => s + i.quantity, 0);
                    const colors = myItem ? CATEGORY_COLORS_ACTIVE[cat.key] : CATEGORY_COLORS[cat.key];
                    const iconColor = CATEGORY_COLORS[cat.key].icon;

                    return (
                        <div key={cat.key} style={{
                            padding: 'var(--spacing-4)',
                            borderRadius: 'var(--radius-md)',
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-3)',
                        }}>
                            {/* Header: icon + label + total badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                <span style={{ color: iconColor, flexShrink: 0, display: 'flex' }}>
                                    {CATEGORY_ICONS[cat.key]}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        color: 'var(--color-text-dim)',
                                        fontWeight: 600,
                                    }}>
                                        {t(`categories.${cat.key}`)}
                                    </div>
                                </div>
                                {totalQty > 0 && (
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: iconColor,
                                        background: `color-mix(in srgb, ${iconColor} 15%, transparent)`,
                                        padding: '1px 8px',
                                        borderRadius: '99px',
                                        flexShrink: 0,
                                    }}>
                                        {totalQty}×
                                    </span>
                                )}
                            </div>

                            {/* Stepper / Add button */}
                            {currentUserId ? (
                                myItem ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button onClick={() => handleSet(cat.key, myItem.quantity - 1)} disabled={isPending} style={stepBtn} title={t('less')}>
                                            <Minus size={11} />
                                        </button>
                                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: iconColor }}>
                                            {myItem.quantity}
                                        </span>
                                        <button onClick={() => handleSet(cat.key, myItem.quantity + 1)} disabled={isPending} style={stepBtn} title={t('more')}>
                                            <Plus size={11} />
                                        </button>
                                        <button
                                            onClick={() => handleSet(cat.key, 0)}
                                            disabled={isPending}
                                            style={{ ...stepBtn, marginLeft: 'auto', borderColor: 'rgba(255,107,107,0.35)', color: 'var(--color-accent)' }}
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
                                            justifyContent: 'center',
                                            gap: '5px',
                                            padding: '5px 0',
                                            borderRadius: 'var(--radius-sm)',
                                            border: `1px dashed ${colors.border}`,
                                            background: 'transparent',
                                            color: 'var(--color-text-dim)',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: isPending ? 'not-allowed' : 'pointer',
                                            opacity: isPending ? 0.5 : 1,
                                            width: '100%',
                                        }}
                                    >
                                        <Plus size={12} /> {t('iWillBring')}
                                    </button>
                                )
                            ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                                    {t('loginRequired')}
                                </span>
                            )}

                            {/* Contributors */}
                            {contributors.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {contributors.map(c => (
                                        <span key={c.id} style={{
                                            fontSize: '0.75rem',
                                            color: c.userId === currentUserId ? iconColor : 'var(--color-text-dim)',
                                            background: c.userId === currentUserId
                                                ? `color-mix(in srgb, ${iconColor} 12%, transparent)`
                                                : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${c.userId === currentUserId ? colors.border : 'var(--color-border)'}`,
                                            borderRadius: '99px',
                                            padding: '2px 7px',
                                            fontWeight: c.userId === currentUserId ? 600 : 400,
                                        }}>
                                            {c.userName} · {c.quantity}×
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
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
