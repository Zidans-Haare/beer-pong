'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FormDots from './FormDots';

export interface RankingRow {
    id: string;
    name: string;
    gold: number;
    silver: number;
    bronze: number;
    wins: number;
    played: number;
    winRate: number; // 0..1
    cupDiff: number;
    tournaments: number;
    form: ('W' | 'L')[];
    longestWinStreak: number;
    isMe: boolean;
}

type SortKey = 'medals' | 'winRate' | 'cupDiff';

const perGame = (r: RankingRow) => (r.played > 0 ? r.cupDiff / r.played : 0);

// `rows` kommt bereits nach Medaillen sortiert (Gold → Silber → Bronze → Siege → Becherdifferenz)
export default function StatsRanking({ rows, minGames }: { rows: RankingRow[]; minGames: number }) {
    const t = useTranslations('stats');
    const [sort, setSort] = useState<SortKey>('medals');
    const [open, setOpen] = useState<string | null>(null);

    const sorted = useMemo(() => {
        if (sort === 'medals') return rows.map((row, i) => ({ row, rank: i + 1 as number | null }));
        const value = sort === 'winRate' ? (r: RankingRow) => r.winRate : perGame;
        const by = (a: RankingRow, b: RankingRow) => value(b) - value(a) || b.wins - a.wins || a.name.localeCompare(b.name);
        // Zu wenige Spiele: ohne Platz ans Ende
        const eligible = rows.filter(r => r.played >= minGames).sort(by);
        const rest = rows.filter(r => r.played < minGames).sort(by);
        return [...eligible.map((row, i) => ({ row, rank: i + 1 as number | null })), ...rest.map(row => ({ row, rank: null as number | null }))];
    }, [rows, sort, minGames]);

    const formLabels = { win: t('win'), loss: t('loss'), winShort: t('winShort'), lossShort: t('lossShort') };
    const sorts: { key: SortKey; label: string }[] = [
        { key: 'medals', label: t('sortMedals') },
        { key: 'winRate', label: t('sortWinRate') },
        { key: 'cupDiff', label: t('sortCupDiff') },
    ];

    return (
        <div>
            <div className="ranking-sort" role="group" aria-label={t('sortBy')}>
                {sorts.map(s => (
                    <button key={s.key} type="button" className={`ranking-sort-button${sort === s.key ? ' is-active' : ''}`} aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>
                        {s.label}
                    </button>
                ))}
            </div>
            {sort !== 'medals' && <p className="ranking-note">{t('minGamesNote', { min: minGames })}</p>}

            <div className="ranking-head" aria-hidden="true">
                <span>#</span>
                <span>{t('player')}</span>
                <span className="ranking-num">{t('recordShort')}</span>
                <span className={`ranking-num${sort === 'winRate' ? ' is-sorted' : ''}`}>{t('rate')}</span>
                <span className={`ranking-num${sort === 'cupDiff' ? ' is-sorted' : ''}`}>{sort === 'cupDiff' ? t('perGameShort') : '+/-'}</span>
                <span />
            </div>

            <ul className="ranking-list">
                {sorted.map(({ row, rank }) => {
                    const isOpen = open === row.id;
                    const diff = sort === 'cupDiff' ? perGame(row) : row.cupDiff;
                    const diffText = sort === 'cupDiff' ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : `${diff > 0 ? '+' : ''}${diff}`;
                    return (
                        <li key={row.id} className={`ranking-item${row.isMe ? ' is-me' : ''}${rank === null ? ' is-unranked' : ''}`}>
                            <button type="button" className="ranking-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : row.id)}>
                                <span className="ranking-rank">{rank ?? '–'}</span>
                                <span className="ranking-name">
                                    <span className="ranking-name-text">{row.name}{row.isMe && <span className="ranking-me">{t('you')}</span>}</span>
                                    {(row.gold + row.silver + row.bronze > 0) && (
                                        <span className="ranking-medals">
                                            {row.gold > 0 && <span className="medal-gold">{row.gold}G</span>}
                                            {row.silver > 0 && <span className="medal-silver">{row.silver}S</span>}
                                            {row.bronze > 0 && <span className="medal-bronze">{row.bronze}B</span>}
                                        </span>
                                    )}
                                </span>
                                <span className="ranking-num">{row.wins}–{row.played - row.wins}</span>
                                <span className={`ranking-num${sort === 'winRate' ? ' is-sorted' : ''}`}>{row.played > 0 ? `${Math.round(row.winRate * 100)}%` : '–'}</span>
                                <span className={`ranking-num${sort === 'cupDiff' ? ' is-sorted' : ''} ${diff > 0 ? 'is-positive' : diff < 0 ? 'is-negative' : ''}`}>{row.played > 0 ? diffText : '–'}</span>
                                <ChevronDown size={16} className={`ranking-chevron${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
                            </button>
                            {isOpen && (
                                <dl className="ranking-detail">
                                    <div><dt>{t('games')}</dt><dd>{row.played}</dd></div>
                                    <div><dt>{t('tournaments')}</dt><dd>{row.tournaments}</dd></div>
                                    <div><dt>{t('cupsPerGame')}</dt><dd>{row.played > 0 ? `${perGame(row) > 0 ? '+' : ''}${perGame(row).toFixed(1)}` : '–'}</dd></div>
                                    <div><dt>{t('longestStreak')}</dt><dd>{row.longestWinStreak}</dd></div>
                                    <div><dt>{t('form')}</dt><dd><FormDots form={row.form} labels={formLabels} /></dd></div>
                                    <div><dt>{t('totalMedals')}</dt><dd>{row.gold + row.silver + row.bronze}</dd></div>
                                    <div className="ranking-detail-link"><Link href={`/players/${row.id}`}>{t('toProfile')}</Link></div>
                                </dl>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
