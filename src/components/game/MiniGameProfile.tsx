import Link from 'next/link';
import { format } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import { Gamepad2, Swords, Trophy, Hourglass } from 'lucide-react';
import type { MiniGameProfile as Profile } from '@/lib/minigame/profile';

const pct = (wins: number, games: number) => (games > 0 ? `${Math.round((wins / games) * 100)}%` : '–');

// Minispiel-Bilanz auf dem Profil: Gesamt, gegen den Rechner nach Stufe, Duelle, direkter Vergleich und letzte Duelle
export default async function MiniGameProfile({ profile, own }: { profile: Profile; own: boolean }) {
    const t = await getTranslations('profileGame');
    const open = profile.duels.waitingForMe + profile.duels.waitingForThem;
    if (profile.games === 0 && open === 0) return null;
    const { cpu, duels } = profile;

    return (
        <section className="pg" aria-label={t('title')}>
            <h2 className="pg-title"><Gamepad2 size={20} aria-hidden="true" /> {t('title')}</h2>

            <div className="pg-grid">
                <div className="pg-box"><strong>{profile.games}</strong><span>{t('games')}</span></div>
                <div className="pg-box"><strong>{profile.wins}</strong><span>{t('wins')}</span></div>
                <div className="pg-box"><strong>{pct(profile.wins, profile.games)}</strong><span>{t('winRate')}</span></div>
                <div className="pg-box"><strong>{profile.bestRounds ?? '–'}</strong><span>{t('bestRounds')}</span></div>
                <div className="pg-box"><strong>{profile.averageRounds ?? '–'}</strong><span>{t('averageRounds')}</span></div>
                <div className="pg-box"><strong>{profile.hits}</strong><span>{t('hits')}</span></div>
            </div>

            <div className="pg-split">
                <div className="pg-card">
                    <h3><Swords size={16} aria-hidden="true" /> {t('duels')}</h3>
                    {duels.games === 0 ? <p className="pg-empty">{t('noDuels')}</p> : (
                        <dl className="pg-list">
                            <div><dt>{t('duelRecord')}</dt><dd>{duels.wins} {t('winsShort')} · {duels.losses} {t('lossesShort')} ({pct(duels.wins, duels.games)})</dd></div>
                            <div><dt>{t('asChallenger')}</dt><dd>{duels.asChallenger.wins}/{duels.asChallenger.games}</dd></div>
                            <div><dt>{t('asOpponent')}</dt><dd>{duels.asOpponent.wins}/{duels.asOpponent.games}</dd></div>
                        </dl>
                    )}
                    {duels.games > 0 && (
                        <div className="pg-naked" aria-label={t('nakedDuelTitle')}>
                            <span className="pg-naked-title">🏃 {t('nakedDuelTitle')}</span>
                            <div className="pg-naked-row">
                                <div><strong>{duels.nakedMiles.taken}</strong><span>{t('nakedTaken')}</span></div>
                                <div><strong>{duels.nakedMiles.dealt}</strong><span>{t('nakedDealt')}</span></div>
                            </div>
                        </div>
                    )}
                    {open > 0 && (
                        <p className="pg-open"><Hourglass size={14} aria-hidden="true" /> {[
                            duels.waitingForMe > 0 ? t('waitingForMe', { count: duels.waitingForMe }) : null,
                            duels.waitingForThem > 0 ? t('waitingForThem', { count: duels.waitingForThem }) : null,
                        ].filter(Boolean).join(' · ')}{own && duels.waitingForMe > 0 && <> <Link href="/game">{t('openGame')}</Link></>}</p>
                    )}
                </div>

                <div className="pg-card">
                    <h3><Gamepad2 size={16} aria-hidden="true" /> {t('vsComputer')}</h3>
                    {cpu.games === 0 ? <p className="pg-empty">{t('noCpu')}</p> : (
                        <dl className="pg-list">
                            {(['easy', 'normal', 'hard', 'impossible'] as const).map(level => (
                                <div key={level}><dt>{t(`level.${level}`)}</dt><dd>{cpu.byLevel[level].games > 0 ? `${cpu.byLevel[level].wins}/${cpu.byLevel[level].games} (${pct(cpu.byLevel[level].wins, cpu.byLevel[level].games)})` : '–'}</dd></div>
                            ))}
                        </dl>
                    )}
                    {(cpu.nakedMiles.ran > 0 || cpu.nakedMiles.made > 0) && (
                        <p className="pg-open">{t('nakedMiles', { ran: cpu.nakedMiles.ran, made: cpu.nakedMiles.made })}</p>
                    )}
                </div>
            </div>

            {profile.headToHead.length > 0 && (
                <div className="pg-card">
                    <h3><Trophy size={16} aria-hidden="true" /> {t('headToHead')}</h3>
                    <ul className="pg-rivals">
                        {profile.headToHead.map(r => (
                            <li key={r.id}>
                                <Link href={`/players/${r.id}`}>{r.name}</Link>
                                <span className="pg-bar" aria-hidden="true"><span style={{ width: `${(r.wins / (r.wins + r.losses)) * 100}%` }} /></span>
                                <strong>{r.wins}:{r.losses}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {profile.recentDuels.length > 0 && (
                <div className="pg-card">
                    <h3>{t('recentDuels')}</h3>
                    <ul className="pg-recent">
                        {profile.recentDuels.map(d => (
                            <li key={d.id} className={d.won ? 'is-win' : 'is-loss'}>
                                <span className="pg-chip">{d.won ? t('won') : t('lost')}</span>
                                <span className="pg-recent-main">
                                    <Link href={`/players/${d.opponentId}`}>{t('against', { name: d.opponentName })}</Link>
                                    <small>
                                        {t(d.challenger ? 'roleChallenger' : 'roleOpponent')} · {t('rounds', { mine: d.myRounds ?? '–', theirs: d.theirRounds ?? '–' })} · {t('hitsLine', { mine: d.myHits ?? '–', theirs: d.theirHits ?? '–' })} · {t(`size.${d.cupSize}`)}
                                        {d.nakedMile && ` · ${t(d.nakedMile === 'me' ? 'nakedMe' : 'nakedThem')}`}
                                    </small>
                                </span>
                                <time dateTime={d.date.toISOString()}>{format(d.date, 'dd.MM.yy')}</time>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
