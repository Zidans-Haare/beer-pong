'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trophy, PartyPopper, Calendar, Users, X } from 'lucide-react';
import type { StatsPeriod } from '@/lib/stats';
import type { Player } from '@prisma/client';

const PERIODS: { key: StatsPeriod; label: string }[] = [
    { key: 'month', label: 'Monat' },
    { key: 'last5', label: 'Letzte 5' },
    { key: 'year', label: 'Jahr' },
    { key: 'all', label: 'All Time' },
];

export default function StatsFilterBar({
    onlyRanked,
    activePeriod,
    selectedPlayerIds,
    allPlayers,
}: {
    onlyRanked: boolean;
    activePeriod: StatsPeriod;
    selectedPlayerIds: string[];
    allPlayers: Player[];
}) {
    const router = useRouter();
    const [playerSearch, setPlayerSearch] = useState('');
    const [showPlayerPicker, setShowPlayerPicker] = useState(false);

    function buildUrl(overrides: { ranked?: boolean; period?: StatsPeriod; players?: string[] }) {
        const params = new URLSearchParams();
        const r = overrides.ranked ?? onlyRanked;
        const p = overrides.period ?? activePeriod;
        const pl = overrides.players ?? selectedPlayerIds;
        if (!r) params.set('ranked', 'false');
        if (p !== 'all') params.set('period', p);
        if (pl.length > 0) params.set('players', pl.join(','));
        const qs = params.toString();
        return '/stats' + (qs ? '?' + qs : '');
    }

    function navigate(url: string) {
        router.push(url);
        router.refresh();
    }

    function togglePlayer(id: string) {
        const next = selectedPlayerIds.includes(id)
            ? selectedPlayerIds.filter(p => p !== id)
            : [...selectedPlayerIds, id];
        navigate(buildUrl({ players: next }));
    }

    const filteredPlayers = allPlayers.filter(p =>
        p.name.toLowerCase().includes(playerSearch.toLowerCase())
    );

    return (
        <div style={{
            display: 'grid', gap: 'var(--spacing-3)',
            marginBottom: 'var(--spacing-6)',
            padding: 'var(--spacing-4)', background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)'
        }}>
            {/* Zeile 1: Zeitraum */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-full)', padding: '3px', border: '1px solid var(--color-border)' }}>
                    {PERIODS.map(({ key, label }) => (
                        <button key={key} onClick={() => navigate(buildUrl({ period: key }))}
                            style={{
                                padding: '6px 12px', borderRadius: 'var(--radius-full)', border: 'none',
                                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                background: activePeriod === key ? 'var(--color-primary)' : 'transparent',
                                color: activePeriod === key ? 'white' : 'var(--color-text-dim)',
                                transition: 'all 0.2s ease'
                            }}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--color-border)' }} />

            {/* Zeile 2: Rangliste / Alles */}
            <div style={{ display: 'inline-flex', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-full)', padding: '3px', border: '1px solid var(--color-border)', alignSelf: 'start' }}>
                <button onClick={() => navigate(buildUrl({ ranked: true }))}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 12px', borderRadius: 'var(--radius-full)', border: 'none',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        background: onlyRanked ? 'var(--color-primary)' : 'transparent',
                        color: onlyRanked ? 'white' : 'var(--color-text-dim)',
                        transition: 'all 0.2s ease'
                    }}>
                    <Trophy size={12} /> Rangliste
                </button>
                <button onClick={() => navigate(buildUrl({ ranked: false }))}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 12px', borderRadius: 'var(--radius-full)', border: 'none',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        background: !onlyRanked ? 'var(--color-primary)' : 'transparent',
                        color: !onlyRanked ? 'white' : 'var(--color-text-dim)',
                        transition: 'all 0.2s ease'
                    }}>
                    <PartyPopper size={12} /> Alles
                </button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--color-border)' }} />

            {/* Spieler-Filter */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowPlayerPicker(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        border: selectedPlayerIds.length > 0 ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: selectedPlayerIds.length > 0 ? 'rgba(217,70,239,0.1)' : 'var(--color-surface-secondary)',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        color: selectedPlayerIds.length > 0 ? 'var(--color-primary)' : 'var(--color-text-dim)',
                    }}>
                    <Users size={12} />
                    {selectedPlayerIds.length > 0 ? `${selectedPlayerIds.length} Spieler` : 'Alle Spieler'}
                </button>

                {selectedPlayerIds.length > 0 && (
                    <button onClick={() => navigate(buildUrl({ players: [] }))}
                        style={{
                            position: 'absolute', top: '-6px', right: '-6px',
                            width: '16px', height: '16px', borderRadius: '50%',
                            background: 'var(--color-primary)', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                        <X size={10} color="white" />
                    </button>
                )}

                {showPlayerPicker && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: '6px',
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                        zIndex: 50, width: 'min(260px, calc(100vw - 2 * var(--spacing-4)))',
                        padding: 'var(--spacing-3)'
                    }}>
                        <input
                            type="text"
                            placeholder="Suchen..."
                            value={playerSearch}
                            onChange={e => setPlayerSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '6px 10px', marginBottom: '8px',
                                background: 'var(--color-surface-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
                                fontSize: '0.85rem', boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {filteredPlayers.map(p => {
                                const selected = selectedPlayerIds.includes(p.id);
                                return (
                                    <div key={p.id} onClick={() => togglePlayer(p.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '6px 8px', borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            background: selected ? 'rgba(217,70,239,0.12)' : 'transparent',
                                        }}>
                                        <div style={{
                                            width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
                                            background: selected ? 'var(--color-primary)' : 'transparent',
                                            border: selected ? 'none' : '2px solid var(--color-border-strong)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {selected && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: selected ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: selected ? 600 : 400 }}>
                                            {p.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
