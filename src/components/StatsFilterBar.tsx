'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trophy, PartyPopper, Calendar, CalendarRange, Users, X } from 'lucide-react';
import type { StatsPeriod } from '@/lib/stats';
import type { Player } from '@prisma/client';
import { useTranslations } from 'next-intl';

const PERIOD_KEYS: StatsPeriod[] = ['month', 'last5', 'year', 'all'];

export default function StatsFilterBar({
    seasons,
    activeSeasonId,
    currentSeasonId,
    onlyRanked,
    activePeriod,
    selectedPlayerIds,
    allPlayers,
}: {
    seasons: { id: string; name: string }[];
    activeSeasonId: string; // Saison-ID oder 'all'
    currentSeasonId: string | null;
    onlyRanked: boolean;
    activePeriod: StatsPeriod;
    selectedPlayerIds: string[];
    allPlayers: Player[];
}) {
    const t = useTranslations('stats');
    const router = useRouter();
    const [playerSearch, setPlayerSearch] = useState('');
    const [showPlayerPicker, setShowPlayerPicker] = useState(false);

    function buildUrl(overrides: { ranked?: boolean; period?: StatsPeriod; players?: string[]; season?: string }) {
        const params = new URLSearchParams();
        const r = overrides.ranked ?? onlyRanked;
        const p = overrides.period ?? activePeriod;
        const pl = overrides.players ?? selectedPlayerIds;
        const se = overrides.season ?? activeSeasonId;
        // Aktuelle Saison ist der Standard und braucht keinen Parameter
        if (se !== currentSeasonId) params.set('season', se);
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

    const periodLabels: Record<StatsPeriod, string> = {
        month: t('month'),
        last5: t('last5'),
        year: t('year'),
        all: t('allTime'),
    };

    return (
        <div style={{
            display: 'grid', gap: 'var(--spacing-3)',
            marginBottom: 'var(--spacing-6)',
            padding: 'var(--spacing-4)', background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)'
        }}>
            {/* Season */}
            {seasons.length > 0 && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarRange size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
                        <div role="group" aria-label={t('season')} style={{ display: 'flex', flexWrap: 'wrap', background: 'var(--color-surface-secondary)', borderRadius: "var(--radius-md)", padding: '3px', border: '1px solid var(--color-border)' }}>
                            {[...seasons, { id: 'all', name: t('allSeasons') }].map((se) => (
                                <button key={se.id} onClick={() => navigate(buildUrl({ season: se.id }))} aria-pressed={activeSeasonId === se.id}
                                    style={{
                                        padding: '6px 12px', borderRadius: "var(--radius-md)", border: 'none',
                                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                        background: activeSeasonId === se.id ? 'var(--color-primary)' : 'transparent',
                                        color: activeSeasonId === se.id ? 'white' : 'var(--color-text-dim)',
                                        transition: 'all 0.2s ease'
                                    }}>
                                    {se.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ height: '1px', background: 'var(--color-border)' }} />
                </>
            )}

            {/* Row 1: Period */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', background: 'var(--color-surface-secondary)', borderRadius: "var(--radius-md)", padding: '3px', border: '1px solid var(--color-border)' }}>
                    {PERIOD_KEYS.map((key) => (
                        <button key={key} onClick={() => navigate(buildUrl({ period: key }))}
                            style={{
                                padding: '6px 12px', borderRadius: "var(--radius-md)", border: 'none',
                                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                background: activePeriod === key ? 'var(--color-primary)' : 'transparent',
                                color: activePeriod === key ? 'white' : 'var(--color-text-dim)',
                                transition: 'all 0.2s ease'
                            }}>
                            {periodLabels[key]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--color-border)' }} />

            {/* Row 2: Ranked / All */}
            <div style={{ display: 'inline-flex', background: 'var(--color-surface-secondary)', borderRadius: "var(--radius-md)", padding: '3px', border: '1px solid var(--color-border)', justifySelf: 'start' }}>
                <button onClick={() => navigate(buildUrl({ ranked: true }))}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 12px', borderRadius: "var(--radius-md)", border: 'none',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        background: onlyRanked ? 'var(--color-primary)' : 'transparent',
                        color: onlyRanked ? 'white' : 'var(--color-text-dim)',
                        transition: 'all 0.2s ease'
                    }}>
                    <Trophy size={12} /> {t('ranked')}
                </button>
                <button onClick={() => navigate(buildUrl({ ranked: false }))}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 12px', borderRadius: "var(--radius-md)", border: 'none',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        background: !onlyRanked ? 'var(--color-primary)' : 'transparent',
                        color: !onlyRanked ? 'white' : 'var(--color-text-dim)',
                        transition: 'all 0.2s ease'
                    }}>
                    <PartyPopper size={12} /> {t('all')}
                </button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--color-border)' }} />

            {/* Player Filter */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowPlayerPicker(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: "var(--radius-md)",
                        border: selectedPlayerIds.length > 0 ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: selectedPlayerIds.length > 0 ? "rgba(var(--color-primary-rgb), 0.1)" : 'var(--color-surface-secondary)',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        color: selectedPlayerIds.length > 0 ? 'var(--color-primary)' : 'var(--color-text-dim)',
                    }}>
                    <Users size={12} />
                    {selectedPlayerIds.length > 0 ? t('nPlayers', { count: selectedPlayerIds.length }) : t('allPlayers')}
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
                            placeholder={t('search')}
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
                                            background: selected ? "rgba(var(--color-primary-rgb), 0.12)" : 'transparent',
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
