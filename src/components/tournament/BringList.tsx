'use client';

import { useTransition, useState, useEffect, useRef } from 'react';
import { setBringItem, setBringItemPrice } from '@/app/actions/bring-list';
import { BRING_CATEGORIES } from '@/lib/bring-categories';
import { useRouter } from 'next/navigation';
import { Droplets, Table2, CupSoda, CircleDot, ShoppingBag, Minus, Plus, X, Package, Euro, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BringItemData = { id: string; category: string; userId: string; userName: string; quantity: number; price: number | null };

const PREDEFINED_KEYS: Set<string> = new Set(BRING_CATEGORIES.map(c => c.key));

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    BEER:   <Droplets  size={14} />,
    TABLES: <Table2    size={14} />,
    CUPS:   <CupSoda   size={14} />,
    BALLS:  <CircleDot size={14} />,
};

// ── Price bottom-sheet ─────────────────────────────────────────────────────
function PriceSheet({ label, currentPrice, onSave, onClose }: {
    label: string;
    currentPrice: number | null;
    onSave: (price: number | null) => void;
    onClose: () => void;
}) {
    const [value, setValue] = useState(currentPrice != null ? String(currentPrice) : '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 80);
    }, []);

    function submit() {
        const parsed = parseFloat(value.replace(',', '.'));
        onSave(isNaN(parsed) || parsed <= 0 ? null : Math.round(parsed * 100) / 100);
        onClose();
    }

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
            />
            {/* Sheet */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
                background: 'var(--color-surface)',
                borderRadius: '20px 20px 0 0',
                padding: '24px 24px 40px',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        <Euro size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        {label}
                    </span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--color-text-dim)' }}>€</span>
                    <input
                        ref={inputRef}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.50"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submit()}
                        placeholder="0.00"
                        style={{
                            flex: 1,
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '2px solid var(--color-primary)',
                            color: 'var(--color-text)',
                            outline: 'none',
                            padding: '4px 0',
                            width: '100%',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    {currentPrice != null && (
                        <button
                            onClick={() => { onSave(null); onClose(); }}
                            style={{
                                flex: 1, padding: '14px', borderRadius: '12px',
                                border: '1px solid var(--color-border)',
                                background: 'transparent', color: 'var(--color-text-dim)',
                                fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            Entfernen
                        </button>
                    )}
                    <button
                        onClick={submit}
                        style={{
                            flex: 2, padding: '14px', borderRadius: '12px',
                            border: 'none', background: 'var(--color-primary)',
                            color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                    >
                        <Check size={18} /> Speichern
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BringList({ tournamentId, initialItems, currentUserId }: {
    tournamentId: string;
    initialItems: BringItemData[];
    currentUserId: string | null;
}) {
    const t = useTranslations('bringList');
    const [items, setItems] = useState<BringItemData[]>(initialItems);
    const [isPending, startTransition] = useTransition();
    const [customInput, setCustomInput] = useState('');
    const router = useRouter();

    useEffect(() => { setItems(initialItems); }, [initialItems]);

    function getMyItem(category: string) {
        return items.find(i => i.category === category && i.userId === currentUserId);
    }

    function handleSet(category: string, quantity: number) {
        if (!currentUserId || isPending) return;
        setItems(prev => {
            const without = prev.filter(i => !(i.category === category && i.userId === currentUserId));
            if (quantity <= 0) return without;
            const existing = prev.find(i => i.category === category && i.userId === currentUserId);
            return [...without, { id: existing?.id ?? `opt-${Date.now()}`, category, userId: currentUserId, userName: t('you'), quantity, price: existing?.price ?? null }];
        });
        startTransition(async () => {
            const myItem = items.find(i => i.category === category && i.userId === currentUserId);
            await setBringItem(tournamentId, category, quantity, myItem?.price);
            router.refresh();
        });
    }

    function handlePriceChange(category: string, price: number | null) {
        setItems(prev => prev.map(i =>
            i.category === category && i.userId === currentUserId ? { ...i, price } : i
        ));
        startTransition(async () => {
            await setBringItemPrice(tournamentId, category, price);
            router.refresh();
        });
    }

    function handleAddCustom() {
        const label = customInput.trim();
        if (!label || !currentUserId) return;
        setCustomInput('');
        handleSet(label, 1);
    }

    const customCategories = [...new Set(
        items.filter(i => !PREDEFINED_KEYS.has(i.category)).map(i => i.category)
    )];

    const totalCost = items.reduce((sum, i) => sum + (i.price ?? 0), 0);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--spacing-3)', color: 'var(--color-text-dim)' }}>
                <ShoppingBag size={13} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('title')}
                </span>
                {totalCost > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(190,35,213,0.1)', padding: '1px 7px', borderRadius: '99px' }}>
                        {t('totalCost', { amount: totalCost.toFixed(2) })}
                    </span>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)' }}>
                {BRING_CATEGORIES.map(cat => (
                    <CategoryCard
                        key={cat.key}
                        categoryKey={cat.key}
                        label={t(`categories.${cat.key as 'BEER' | 'TABLES' | 'CUPS' | 'BALLS'}`)}
                        icon={CATEGORY_ICONS[cat.key]}
                        items={items}
                        myItem={getMyItem(cat.key)}
                        currentUserId={currentUserId}
                        isPending={isPending}
                        t={t}
                        onSet={handleSet}
                        onPriceChange={handlePriceChange}
                    />
                ))}
            </div>

            {customCategories.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                    {customCategories.map(cat => (
                        <CategoryCard
                            key={cat}
                            categoryKey={cat}
                            label={cat}
                            icon={<Package size={14} />}
                            items={items}
                            myItem={getMyItem(cat)}
                            currentUserId={currentUserId}
                            isPending={isPending}
                            t={t}
                            onSet={handleSet}
                            onPriceChange={handlePriceChange}
                            fullWidth
                        />
                    ))}
                </div>
            )}

            {currentUserId && (
                <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                    <input
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                        placeholder={t('customPlaceholder')}
                        maxLength={40}
                        style={{ flex: 1, padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none' }}
                    />
                    <button
                        onClick={handleAddCustom}
                        disabled={!customInput.trim() || isPending}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-dim)', fontSize: '0.8rem', fontWeight: 500, cursor: !customInput.trim() || isPending ? 'not-allowed' : 'pointer', opacity: !customInput.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
                    >
                        <Plus size={12} /> {t('addCustom')}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Category card ──────────────────────────────────────────────────────────
function CategoryCard({ categoryKey, label, icon, items, myItem, currentUserId, isPending, t, onSet, onPriceChange, fullWidth }: {
    categoryKey: string; label: string; icon: React.ReactNode;
    items: BringItemData[]; myItem: BringItemData | undefined;
    currentUserId: string | null; isPending: boolean;
    t: ReturnType<typeof useTranslations<'bringList'>>;
    onSet: (category: string, quantity: number) => void;
    onPriceChange: (category: string, price: number | null) => void;
    fullWidth?: boolean;
}) {
    const contributors = items.filter(i => i.category === categoryKey);
    const totalQty = contributors.reduce((s, i) => s + i.quantity, 0);
    const totalPrice = contributors.reduce((s, i) => s + (i.price ?? 0), 0);
    const [showPriceSheet, setShowPriceSheet] = useState(false);

    return (
        <>
            <div style={{
                padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)',
                background: myItem ? 'rgba(var(--color-primary-rgb, 190, 35, 213), 0.05)' : 'var(--color-surface-hover)',
                border: `1px solid ${myItem ? 'var(--color-primary)' : 'var(--color-border)'}`,
                transition: 'border-color 0.2s, background 0.2s',
                display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: myItem ? 'var(--color-primary)' : 'var(--color-text-dim)', display: 'flex', flexShrink: 0 }}>{icon}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    {totalQty > 0 && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(190,35,213,0.1)', padding: '1px 5px', borderRadius: '99px', flexShrink: 0 }}>
                            {totalQty}×
                        </span>
                    )}
                    {totalPrice > 0 && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981', flexShrink: 0 }}>
                            {totalPrice.toFixed(2)}€
                        </span>
                    )}
                </div>

                {/* Actions */}
                {currentUserId ? (
                    myItem ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <button onClick={() => onSet(categoryKey, myItem.quantity - 1)} disabled={isPending} style={stepBtn} title={t('less')}><Minus size={10} /></button>
                                <span style={{ minWidth: '16px', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-primary)' }}>{myItem.quantity}</span>
                                <button onClick={() => onSet(categoryKey, myItem.quantity + 1)} disabled={isPending} style={stepBtn} title={t('more')}><Plus size={10} /></button>
                                <button onClick={() => onSet(categoryKey, 0)} disabled={isPending} style={{ ...stepBtn, marginLeft: 'auto', borderColor: 'rgba(255,107,107,0.4)', color: 'var(--color-accent)' }} title={t('remove')}><X size={10} /></button>
                            </div>
                            {/* Price tap target */}
                            <button
                                onClick={() => setShowPriceSheet(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                                    border: myItem.price != null ? '1px solid #10b981' : '1px dashed var(--color-border)',
                                    background: myItem.price != null ? 'rgba(16,185,129,0.08)' : 'transparent',
                                    color: myItem.price != null ? '#10b981' : 'var(--color-text-dim)',
                                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', width: '100%',
                                    minHeight: '36px',
                                }}
                            >
                                <Euro size={12} />
                                {myItem.price != null ? `${myItem.price.toFixed(2)} €` : t('addPrice')}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => onSet(categoryKey, 1)} disabled={isPending}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '3px 0', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)', background: 'transparent', color: 'var(--color-text-dim)', fontSize: '0.75rem', fontWeight: 500, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.5 : 1, width: '100%' }}
                        >
                            <Plus size={11} /> {t('iWillBring')}
                        </button>
                    )
                ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>{t('loginRequired')}</span>
                )}

                {/* Contributors */}
                {contributors.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {contributors.map(c => (
                            <span key={c.id} style={{ fontSize: '0.7rem', color: c.userId === currentUserId ? 'var(--color-primary)' : 'var(--color-text-dim)', background: 'var(--color-surface)', border: `1px solid ${c.userId === currentUserId ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: '99px', padding: '1px 6px' }}>
                                {c.userName} · {c.quantity}×{c.price != null ? ` · ${c.price.toFixed(2)}€` : ''}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {showPriceSheet && myItem && (
                <PriceSheet
                    label={label}
                    currentPrice={myItem.price}
                    onSave={price => onPriceChange(categoryKey, price)}
                    onClose={() => setShowPriceSheet(false)}
                />
            )}
        </>
    );
}

const stepBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '20px', height: '20px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-dim)', cursor: 'pointer', padding: 0, flexShrink: 0,
};
