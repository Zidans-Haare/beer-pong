'use client';

import { useMemo } from 'react';
import { Receipt, Users, Euro, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BringItem = {
    userId: string;
    userName: string;
    price: number | null;
};

type Debt = { from: string; fromName: string; to: string; toName: string; amount: number };

export type CostSplitProps = {
    items: BringItem[];
    participantCount: number;
    participantUserIds: string[];
    currentUserId: string | null;
    costPerPerson: number | null;  // set after tournament starts (frozen)
    isActive: boolean;             // tournament ACTIVE or COMPLETED
    paypalHandles: Record<string, string>; // userId → paypalMeUrl
};

export default function CostSplitWidget({
    items, participantCount, participantUserIds, currentUserId, costPerPerson, isActive, paypalHandles,
}: CostSplitProps) {
    const t = useTranslations('costSplit');
    const { totalCost, perPersonEstimate, debts } = useMemo(() => {
        const total = items.reduce((s, i) => s + (i.price ?? 0), 0);
        const count = isActive ? participantCount : Math.max(participantCount, 1);
        const frozen = costPerPerson ?? (total > 0 ? total / count : 0);
        const perPerson = isActive ? (costPerPerson ?? frozen) : (total > 0 ? total / count : 0);

        // Build balance map: positive = creditor, negative = debtor
        const balance: Record<string, { name: string; amount: number }> = {};

        // Everyone owes their fair share
        for (const uid of participantUserIds) {
            if (!balance[uid]) balance[uid] = { name: uid, amount: 0 };
            balance[uid].amount -= perPerson;
        }

        // Payers get credited
        for (const item of items) {
            if (item.price != null && item.price > 0) {
                if (!balance[item.userId]) balance[item.userId] = { name: item.userName, amount: 0 };
                balance[item.userId].amount += item.price;
                balance[item.userId].name = item.userName;
            }
        }

        // Greedy debt settlement
        const debts: Debt[] = [];
        const creditors = Object.entries(balance).filter(([, b]) => b.amount > 0.01).sort((a, b) => b[1].amount - a[1].amount);
        const debtors = Object.entries(balance).filter(([, b]) => b.amount < -0.01).sort((a, b) => a[1].amount - b[1].amount);

        let ci = 0, di = 0;
        const cred = creditors.map(([id, b]) => ({ id, name: b.name, amount: b.amount }));
        const debt = debtors.map(([id, b]) => ({ id, name: b.name, amount: -b.amount }));

        while (ci < cred.length && di < debt.length) {
            const pay = Math.min(cred[ci].amount, debt[di].amount);
            if (pay > 0.01) {
                debts.push({ from: debt[di].id, fromName: debt[di].name, to: cred[ci].id, toName: cred[ci].name, amount: Math.round(pay * 100) / 100 });
            }
            cred[ci].amount -= pay;
            debt[di].amount -= pay;
            if (cred[ci].amount < 0.01) ci++;
            if (debt[di].amount < 0.01) di++;
        }

        return { totalCost: total, perPersonEstimate: perPerson, debts };
    }, [items, participantCount, participantUserIds, costPerPerson, isActive]);

    if (totalCost === 0 && !isActive) return null;

    const myDebts = debts.filter(d => d.from === currentUserId);
    const myCredits = debts.filter(d => d.to === currentUserId);

    return (
        <div style={{
            background: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-4)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-3)' }}>
                <Receipt size={16} color="var(--color-primary)" />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {isActive ? t('settlement') : t('preview')}
                </span>
                {!isActive && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginLeft: 'auto' }}>
                        {t('frozen')}
                    </span>
                )}
            </div>

            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
                <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text-dim)', fontSize: '0.72rem' }}>
                        <Euro size={11} /> {t('total')}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>
                        {totalCost.toFixed(2)} €
                    </span>
                </div>
                <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text-dim)', fontSize: '0.72rem' }}>
                        <Users size={11} /> {t('perPerson', { count: participantCount })}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: perPersonEstimate > 0 ? 'var(--color-primary)' : 'var(--color-text-dim)' }}>
                        {perPersonEstimate > 0 ? `${perPersonEstimate.toFixed(2)} €` : '—'}
                    </span>
                </div>
            </div>

            {/* My debts */}
            {myDebts.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-2)' }}>
                    {myDebts.map((d, i) => (
                        <DebtRow key={i} debt={d} direction="owe" paypalUrl={paypalHandles[d.to]} />
                    ))}
                </div>
            )}

            {/* My credits */}
            {myCredits.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-2)' }}>
                    {myCredits.map((d, i) => (
                        <DebtRow key={i} debt={d} direction="receive" paypalUrl={null} />
                    ))}
                </div>
            )}

            {/* All settlements (collapsed for non-participants) */}
            {debts.length > 0 && myDebts.length === 0 && myCredits.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {debts.map((d, i) => (
                        <DebtRow key={i} debt={d} direction="other" paypalUrl={paypalHandles[d.to]} />
                    ))}
                </div>
            )}

            {totalCost === 0 && isActive && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', margin: 0 }}>
                    {t('noCosts')}
                </p>
            )}
        </div>
    );
}

function DebtRow({ debt, direction, paypalUrl }: { debt: Debt; direction: 'owe' | 'receive' | 'other'; paypalUrl: string | null }) {
    const t = useTranslations('costSplit');
    const isOwe = direction === 'owe';
    const isReceive = direction === 'receive';

    const paypalLink = paypalUrl && isOwe
        ? `${paypalUrl.startsWith('https://') ? '' : 'https://paypal.me/'}${paypalUrl.replace('https://paypal.me/', '')}/${debt.amount.toFixed(2)}EUR`
        : null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            background: isOwe ? 'rgba(239,68,68,0.08)' : isReceive ? 'rgba(16,185,129,0.08)' : 'var(--color-surface)',
            border: `1px solid ${isOwe ? 'rgba(239,68,68,0.2)' : isReceive ? 'rgba(16,185,129,0.2)' : 'var(--color-border)'}`,
            marginBottom: '4px',
        }}>
            <span style={{ flex: 1, fontSize: '0.82rem' }}>
                {isOwe ? t('youOwe', { name: debt.toName })
                    : isReceive ? t('owesYou', { name: debt.fromName })
                    : t('owes', { from: debt.fromName, to: debt.toName })}
            </span>
            <span style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                color: isOwe ? '#ef4444' : isReceive ? '#10b981' : 'var(--color-text)',
            }}>
                {debt.amount.toFixed(2)} €
            </span>
            {paypalLink && (
                <a
                    href={paypalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#003087',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                    }}
                >
                    PayPal <ExternalLink size={10} />
                </a>
            )}
        </div>
    );
}
