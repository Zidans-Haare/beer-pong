'use client';

import { useTranslations } from 'next-intl';

interface Standing {
    playerId: string;
    playerName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    points: number;
    cupDiff: number;
}

export default function TournamentTable({ standings, highlightTop = 0, label }: { standings: Standing[], highlightTop?: number, label?: string }) {
    const t = useTranslations('bracket');
    const displayLabel = label ?? t('player');
    if (standings.length === 0) return <p style={{ color: 'var(--color-text-dim)', textAlign: 'center' }}>{t('noResults')}</p>;

    return (
        <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: 'var(--spacing-8)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: 'var(--spacing-3)' }}>#</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>{displayLabel}</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>{t('colGames')}</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>{t('colWins')}</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>{t('colLosses')}</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>{t('colDiff')}</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>{t('colPoints')}</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => {
                        const isQualifying = i < highlightTop;
                        return (
                            <tr key={s.playerId} style={{
                                borderBottom: '1px solid var(--color-border)',
                                background: isQualifying ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                                borderLeft: isQualifying ? '4px solid var(--color-success)' : '4px solid transparent'
                            }}>
                                <td style={{ padding: 'var(--spacing-3)' }}>{i + 1}.</td>
                                <td style={{ padding: 'var(--spacing-3)', fontWeight: 'bold' }}>
                                    {s.playerName}
                                </td>
                                <td style={{ padding: 'var(--spacing-3)' }}>{s.matchesPlayed}</td>
                                <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-success)' }}>{s.wins}</td>
                                <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-error)' }}>{s.losses}</td>
                                <td style={{ padding: 'var(--spacing-3)' }}>{s.cupDiff > 0 ? `+${s.cupDiff}` : s.cupDiff}</td>
                                <td style={{ padding: 'var(--spacing-3)', fontWeight: 'bold', color: 'var(--color-primary)' }}>{s.points}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {highlightTop > 0 && (
                <div style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--color-text-dim)', textAlign: 'right' }}>
                    <span style={{ color: 'var(--color-success)', marginRight: '6px' }}>●</span>
                    {t('qualify', { n: highlightTop })}
                </div>
            )}
        </div>
    );
}
