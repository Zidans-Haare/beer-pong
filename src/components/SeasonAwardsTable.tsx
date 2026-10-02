'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Medal } from 'lucide-react';

export type AwardViewCell = string | { text: string; href: string } | { medal: 'gold' | 'silver' | 'bronze'; label: string };

export interface AwardView {
    key: string;
    title: string;
    holder: string | null;
    explanation: string;
    rule: string;
    note: string | null;
    columns: string[];
    rows: { rank: string; player: string; cells: AwardViewCell[]; ineligible: boolean; isHolder: boolean }[];
}

const medalColor = { gold: '#b45309', silver: '#aaa', bronze: '#cd7f32' } as const;

const th: React.CSSProperties = { padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' };
const subTh: React.CSSProperties = { padding: 'var(--spacing-2) var(--spacing-3)', color: 'var(--color-text-dim)', fontWeight: 600 };
const subTd: React.CSSProperties = { padding: 'var(--spacing-2) var(--spacing-3)' };

function Cell({ cell }: { cell: AwardViewCell }) {
    if (typeof cell === 'string') return <>{cell}</>;
    if ('href' in cell) {
        return (
            <Link href={cell.href} style={{ color: 'var(--color-primary)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                {cell.text}
            </Link>
        );
    }
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: medalColor[cell.medal], fontWeight: 700 }}>
            <Medal size={14} /> {cell.label}
        </span>
    );
}

// Season awards: one row per title, click to expand the full ranking behind it
export default function SeasonAwardsTable({ awards, headers, noData }: {
    awards: AwardView[];
    headers: { title: string; holder: string; reason: string };
    noData: string;
}) {
    const [open, setOpen] = useState<Set<string>>(new Set());
    const toggle = (key: string) => setOpen(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    return (
        // The summary never scrolls sideways; only the expanded rankings do.
        // containerType lets an expanded ranking size itself to the visible width (100cqw).
        <div style={{ overflowX: 'hidden', containerType: 'inline-size' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <tr>
                        <th style={{ ...th, paddingLeft: '40px' }}>{headers.title}</th>
                        <th style={th}>{headers.holder}</th>
                        <th style={th}>{headers.reason}</th>
                    </tr>
                </thead>
                <tbody>
                    {awards.map(a => {
                        const isOpen = open.has(a.key);
                        return (
                            <Fragment key={a.key}>
                                <tr
                                    onClick={() => toggle(a.key)}
                                    aria-expanded={isOpen}
                                    style={{ borderTop: '1px solid var(--color-border)', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <td style={{ padding: 'var(--spacing-4)', fontWeight: 800, color: '#b45309', whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                            <ChevronRight size={16} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none', flexShrink: 0 }} />
                                            {a.title}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                        {a.holder ?? <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>–</span>}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontSize: '0.9rem', overflowWrap: 'anywhere' }}>
                                        {a.explanation}
                                    </td>
                                </tr>
                                {isOpen && (
                                    <tr>
                                        <td colSpan={3} style={{ padding: 0 }}>
                                            {/* Sized to the visible width with its own horizontal scroll */}
                                            <div style={{ width: '100cqw', boxSizing: 'border-box', padding: '0 var(--spacing-4) var(--spacing-4)' }}>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', margin: '0 0 var(--spacing-2) 0' }}>{a.rule}</p>
                                            {a.rows.length === 0 ? (
                                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 0 }}>{noData}</p>
                                            ) : (
                                                <div style={{ overflowX: 'auto', overscrollBehaviorX: 'contain' }}>
                                                <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ ...subTh, width: '40px' }}>#</th>
                                                            {a.columns.map(c => <th key={c} style={subTh}>{c}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {a.rows.map((row, i) => (
                                                            <tr key={i} style={{
                                                                borderTop: '1px solid var(--color-border)',
                                                                opacity: row.ineligible ? 0.45 : 1,
                                                                background: row.isHolder ? 'linear-gradient(90deg, rgba(180, 83, 9, 0.1) 0%, transparent 100%)' : 'transparent',
                                                            }}>
                                                                <td style={{ ...subTd, color: 'var(--color-text-dim)', fontWeight: 600 }}>{row.rank}</td>
                                                                <td style={{ ...subTd, fontWeight: row.isHolder ? 800 : 600 }}>{row.player}</td>
                                                                {row.cells.map((cell, j) => <td key={j} style={subTd}><Cell cell={cell} /></td>)}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                </div>
                                            )}
                                            {a.note && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: 'var(--spacing-2) 0 0 0' }}>{a.note}</p>
                                            )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
