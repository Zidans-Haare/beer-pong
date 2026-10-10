'use client';

import { useRouter } from 'next/navigation';
import { Trophy, PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Saison und "nur Liga / alle Turniere" in einer Zeile
export default function StatsFilterBar({
    seasons,
    activeSeasonId,
    currentSeasonId,
    onlyRanked,
}: {
    seasons: { id: string; name: string }[];
    activeSeasonId: string; // Saison-ID oder 'all'
    currentSeasonId: string | null;
    onlyRanked: boolean;
}) {
    const t = useTranslations('stats');
    const router = useRouter();

    function go(overrides: { ranked?: boolean; season?: string }) {
        const params = new URLSearchParams();
        const ranked = overrides.ranked ?? onlyRanked;
        const season = overrides.season ?? activeSeasonId;
        if (!ranked) params.set('ranked', 'false');
        // Aktuelle Saison ist der Standard und braucht keinen Parameter
        if (season !== currentSeasonId) params.set('season', season);
        const qs = params.toString();
        router.push('/stats' + (qs ? '?' + qs : ''));
        router.refresh();
    }

    return (
        <div className="stats-filter">
            {seasons.length > 0 && (
                <div className="segmented" role="group" aria-label={t('season')}>
                    {[...seasons, { id: 'all', name: t('allSeasons') }].map(se => (
                        <button key={se.id} type="button" className={activeSeasonId === se.id ? 'is-active' : ''} aria-pressed={activeSeasonId === se.id} onClick={() => go({ season: se.id })}>
                            {se.name}
                        </button>
                    ))}
                </div>
            )}
            <div className="segmented" role="group" aria-label={t('tournamentFilter')}>
                <button type="button" className={onlyRanked ? 'is-active' : ''} aria-pressed={onlyRanked} onClick={() => go({ ranked: true })}>
                    <Trophy size={12} aria-hidden="true" /> {t('ranked')}
                </button>
                <button type="button" className={!onlyRanked ? 'is-active' : ''} aria-pressed={!onlyRanked} onClick={() => go({ ranked: false })}>
                    <PartyPopper size={12} aria-hidden="true" /> {t('all')}
                </button>
            </div>
        </div>
    );
}
