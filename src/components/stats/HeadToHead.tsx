'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface H2HPlayer {
    id: string;
    name: string;
    opponents: { opponentId: string; opponentName: string; wins: number; losses: number; cupsFor: number; cupsAgainst: number }[];
    nemesisId: string | null;
    favoriteId: string | null;
}

export default function HeadToHead({ players, defaultId }: { players: H2HPlayer[]; defaultId: string | null }) {
    const t = useTranslations('stats');
    const [selectedId, setSelectedId] = useState(defaultId && players.some(p => p.id === defaultId) ? defaultId : players[0]?.id ?? '');
    const selected = players.find(p => p.id === selectedId);

    if (players.length === 0 || !selected) return <p style={{ color: 'var(--color-text-dim)', margin: 0 }}>{t('h2hNone')}</p>;

    const record = (o: { wins: number; losses: number }) => `${o.wins}–${o.losses}`;
    const nemesis = selected.opponents.find(o => o.opponentId === selected.nemesisId);
    const favorite = selected.opponents.find(o => o.opponentId === selected.favoriteId);

    return (
        <div>
            <label className="h2h-select-label" htmlFor="h2h-player">{t('player')}</label>
            <select id="h2h-player" className="h2h-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {(nemesis || favorite) && (
                <div className="h2h-highlights">
                    {nemesis && (
                        <div className="h2h-highlight h2h-nemesis">
                            <span className="h2h-highlight-label">{t('nemesis')}</span>
                            <strong>{nemesis.opponentName}</strong>
                            <span>{record(nemesis)}</span>
                        </div>
                    )}
                    {favorite && (
                        <div className="h2h-highlight h2h-favorite">
                            <span className="h2h-highlight-label">{t('favorite')}</span>
                            <strong>{favorite.opponentName}</strong>
                            <span>{record(favorite)}</span>
                        </div>
                    )}
                </div>
            )}

            {selected.opponents.length === 0 ? (
                <p style={{ color: 'var(--color-text-dim)' }}>{t('h2hNone')}</p>
            ) : (
                <ul className="h2h-list">
                    {selected.opponents.map(o => {
                        const total = o.wins + o.losses;
                        const diff = o.cupsFor - o.cupsAgainst;
                        return (
                            <li key={o.opponentId} className="h2h-row">
                                <span className="h2h-name">{o.opponentName}</span>
                                <span className="h2h-bar" aria-hidden="true">
                                    <span className="h2h-bar-win" style={{ width: `${(o.wins / total) * 100}%` }} />
                                </span>
                                <span className="h2h-record" aria-label={t('h2hRecordLabel', { wins: o.wins, losses: o.losses })}>{record(o)}</span>
                                <span className={`h2h-diff ${diff > 0 ? 'is-positive' : diff < 0 ? 'is-negative' : ''}`}>{diff > 0 ? '+' : ''}{diff}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
            <p className="ranking-note">{t('h2hLegend')}</p>
        </div>
    );
}
