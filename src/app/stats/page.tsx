import { getAllPlayerStats } from '@/lib/stats';
import type { StatsPeriod } from '@/lib/stats';
import StatsCharts from '@/components/StatsCharts';
import StatsExportButton from '@/components/StatsExportButton';
import { Trophy, Medal, Crown, Zap } from 'lucide-react';
import RankingFormulaInfo from '@/components/RankingFormulaInfo';
import StatsFilterBar from '@/components/StatsFilterBar';
import { getPlayers } from '@/app/actions/players';
import UptimeGraph from '@/components/UptimeGraph';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { getTranslations } from 'next-intl/server';

async function syncAndGetUptimeData() {
    const url = process.env.UPTIME_KUMA_URL ?? 'http://localhost:3001';
    const slug = process.env.UPTIME_KUMA_SLUG ?? 'bier';

    // Lokale Wartungsdaten aus maintenance-msg.txt lesen (geschrieben von maintenance-on.sh)
    let localMaintenance: { msg: string; start: string; end: string } | null = null;
    try {
        const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'maintenance-msg.txt'), 'utf-8');
        localMaintenance = JSON.parse(raw);
    } catch { /* keine Wartung aktiv */ }

    // Öffentliche API für aktuelle Heartbeats
    let liveHeartbeats: any[] = [];
    let uptime24h = 1;
    try {
        const res = await fetch(`${url}/api/status-page/heartbeat/${slug}`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const monitorId = Object.keys(data.heartbeatList ?? {})[0];
            liveHeartbeats = monitorId ? (data.heartbeatList[monitorId] ?? []) : [];
            uptime24h = monitorId ? (data.uptimeList?.[`${monitorId}_24`] ?? 1) : 1;
        }
    } catch { /* ignorieren */ }

    // Wartungs-Zeitfenster berechnen
    const maintStartMs = localMaintenance ? new Date(localMaintenance.start).getTime() : NaN;
    const maintEndMs = localMaintenance ? new Date(localMaintenance.end).getTime() : NaN;
    const maintStart = isNaN(maintStartMs) ? null : maintStartMs;
    const maintEnd = isNaN(maintEndMs) ? null : maintEndMs;

    // Neue Heartbeats in DB speichern (mit sofortigem Wartungsstatus)
    if (liveHeartbeats.length > 0) {
        await Promise.allSettled(liveHeartbeats.map((hb: any) => {
            const t = new Date(hb.time).getTime();
            const inMaint = maintStart !== null && maintEnd !== null && t >= maintStart && t <= maintEnd;
            return prisma.uptimeHeartbeat.upsert({
                where: { time: new Date(hb.time) },
                create: { time: new Date(hb.time), status: inMaint ? 3 : hb.status, ping: hb.ping ?? 0, msg: hb.msg ?? '' },
                update: {},
            });
        }));
        await prisma.uptimeHeartbeat.deleteMany({
            where: { time: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        });
    }

    // Wenn Wartung aktiv: bestehende DB-Einträge im Wartungsfenster dauerhaft als Status 3 speichern
    if (maintStart !== null && maintEnd !== null) {
        await prisma.uptimeHeartbeat.updateMany({
            where: { time: { gte: new Date(maintStart), lte: new Date(maintEnd) }, status: { not: 3 } },
            data: { status: 3 },
        });
    }

    // DB-Daten lesen
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stored = await prisma.uptimeHeartbeat.findMany({
        where: { time: { gte: since } },
        orderBy: { time: 'asc' },
    });

    // Wartungs-Zeitfenster anwenden
    const heartbeats = stored.map(h => {
        const t = h.time.getTime();
        const inMaint = maintStart !== null && maintEnd !== null && t >= maintStart && t <= maintEnd;
        return {
            status: inMaint ? 3 : h.status,
            time: h.time.toISOString(),
            msg: inMaint ? (localMaintenance!.msg || 'Wartung') : h.msg,
            ping: h.ping,
        };
    });

    const maintenanceList = localMaintenance ? [{
        title: 'Wartung',
        description: localMaintenance.msg || undefined,
        timeslotList: [{ startDate: localMaintenance.start, endDate: localMaintenance.end }],
    }] : [];

    return { heartbeats, uptime24h, maintenanceList };
}

export const dynamic = 'force-dynamic';

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ ranked?: string; period?: string; players?: string }> }) {
    const { ranked, period, players: playersParam } = await searchParams;
    const onlyRanked = ranked !== 'false';
    const activePeriod = (['month', 'last5', 'year', 'all'].includes(period ?? '') ? period : 'all') as StatsPeriod;
    const selectedPlayerIds = playersParam ? playersParam.split(',').filter(Boolean) : [];
    const t = await getTranslations('stats');

    const [allStats, allPlayers, uptimeData] = await Promise.all([
        getAllPlayerStats(onlyRanked, activePeriod),
        getPlayers(),
        syncAndGetUptimeData(),
    ]);

    let stats = selectedPlayerIds.length > 0
        ? allStats.filter(s => selectedPlayerIds.includes(s.id))
        : allStats;

    // Hide players with no activity in the selected period
    if (activePeriod !== 'all') {
        stats = stats.filter(s => s.matchesPlayed > 0);
    }

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <h1 className="title-display" style={{ fontSize: '2rem' }}>{t('title')}</h1>
                        <p className="subtitle" style={{ fontSize: '0.9rem' }}>{t('subtitle')}</p>
                    </div>
                    <StatsExportButton stats={stats} />
                </div>
                <div style={{
                    marginTop: 'var(--spacing-3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    padding: '4px 12px',
                    background: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid rgba(180, 83, 9, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: '#b45309'
                }}>
                    <Trophy size={14} color="#b45309" />
                    {onlyRanked ? t('onlyRanked') : t('allTournamentsFilter')}
                </div>
            </header>

            <StatsFilterBar
                onlyRanked={onlyRanked}
                activePeriod={activePeriod}
                selectedPlayerIds={selectedPlayerIds}
                allPlayers={allPlayers}
            />

            <StatsCharts stats={stats} />

            {/* Medal Table */}
            <div className="glass-panel" style={{ overflow: 'hidden', marginTop: 'var(--spacing-12)', padding: '0' }}>
                <div style={{ padding: 'var(--spacing-6)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Medal size={20} color="#b45309" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t('medalTable')}</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '480px' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <tr>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem', width: '48px' }}>#</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('player')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: '#b45309', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>{t('gold')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: '#888', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>{t('silver')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: '#cd7f32', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>{t('bronze')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>{t('totalMedals')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...stats]
                                .filter(s => s.goldMedals + s.silverMedals + s.bronzeMedals > 0)
                                .sort((a, b) => {
                                    if (b.goldMedals !== a.goldMedals) return b.goldMedals - a.goldMedals;
                                    if (b.silverMedals !== a.silverMedals) return b.silverMedals - a.silverMedals;
                                    return b.bronzeMedals - a.bronzeMedals;
                                })
                                .map((s, idx) => (
                                    <tr key={s.id} style={{
                                        borderBottom: '1px solid var(--color-border)',
                                        background: idx === 0 ? 'linear-gradient(90deg, rgba(180, 83, 9, 0.08) 0%, transparent 100%)' : 'transparent',
                                    }}>
                                        <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600 }}>{idx + 1}.</td>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold' }}>{s.name}</td>
                                        <td style={{ padding: 'var(--spacing-4)', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: s.goldMedals > 0 ? '#b45309' : 'var(--color-text-dim)' }}>
                                            {s.goldMedals > 0 ? s.goldMedals : '–'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', textAlign: 'center', fontWeight: 700, color: s.silverMedals > 0 ? '#aaa' : 'var(--color-text-dim)' }}>
                                            {s.silverMedals > 0 ? s.silverMedals : '–'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', textAlign: 'center', fontWeight: 700, color: s.bronzeMedals > 0 ? '#cd7f32' : 'var(--color-text-dim)' }}>
                                            {s.bronzeMedals > 0 ? s.bronzeMedals : '–'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-dim)' }}>
                                            {s.goldMedals + s.silverMedals + s.bronzeMedals}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden', marginTop: 'var(--spacing-12)', padding: '0' }}>
                <div style={{ padding: 'var(--spacing-6)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} color="var(--color-primary)" />
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t('allTimeTable')}</h2>
                    </div>
                    <RankingFormulaInfo />
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <tr>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('rank')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('player')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('wins')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('games')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>WIN RATE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>+/-</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('trophies')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('avgPerTournament')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s, idx) => {
                                const isTop3 = idx < 3;
                                const rankColor = idx === 0 ? '#b45309' : (idx === 1 ? '#c0c0c0' : (idx === 2 ? '#cd7f32' : 'var(--color-text-dim)'));

                                return (
                                    <tr key={s.id} style={{
                                        borderBottom: '1px solid var(--color-border)',
                                        background: idx === 0 ? 'linear-gradient(90deg, rgba(180, 83, 9, 0.1) 0%, transparent 100%)' : 'transparent'
                                    }}>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', color: rankColor, fontSize: '1.2rem', fontFamily: '"Outfit", sans-serif' }}>
                                            {idx === 0 && <Crown size={16} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} />}
                                            {idx + 1}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', fontSize: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {s.name}
                                                {isTop3 && <Medal size={14} color={rankColor} />}
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-text)', fontWeight: 600 }}>{s.matchesWon}</td>
                                        <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)' }}>{s.matchesPlayed}</td>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 600, color: s.winRate >= 0.5 ? 'var(--color-success)' : 'var(--color-text)' }}>
                                            {Math.round(s.winRate * 100)}%
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 600, color: s.cupDiff > 0 ? 'var(--color-success)' : (s.cupDiff < 0 ? 'var(--color-error)' : 'var(--color-text-dim)') }}>
                                            {s.cupDiff > 0 ? `+${s.cupDiff}` : s.cupDiff}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {s.goldMedals > 0 && <span style={{ fontWeight: 800, color: '#b45309', fontSize: '0.95rem' }}>{s.goldMedals}G</span>}
                                                {s.silverMedals > 0 && <span style={{ fontWeight: 700, color: '#aaa', fontSize: '0.95rem' }}>{s.silverMedals}S</span>}
                                                {s.bronzeMedals > 0 && <span style={{ fontWeight: 700, color: '#cd7f32', fontSize: '0.95rem' }}>{s.bronzeMedals}B</span>}
                                                {s.goldMedals + s.silverMedals + s.bronzeMedals === 0 && <span style={{ color: 'var(--color-text-dim)' }}>–</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                                            {s.tournamentsPlayed > 0
                                                ? (s.tournamentsWon / s.tournamentsPlayed).toFixed(2)
                                                : '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Special Stats: Tournament Efficiency */}
            <div className="glass-panel" style={{ overflow: 'hidden', marginTop: 'var(--spacing-12)', padding: '0', border: '1px solid var(--color-border)' }}>
                <div style={{ padding: 'var(--spacing-6)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', background: 'linear-gradient(90deg, rgba(180, 83, 9, 0.05) 0%, transparent 100%)' }}>
                    <Zap size={24} color="#b45309" />
                    <div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t('tournamentEfficiency')}</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 'var(--spacing-1) 0 0 0' }}>
                            {t('efficiencySubtitle')}
                            <span style={{
                                display: 'inline-block',
                                marginLeft: '12px',
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '99px',
                                background: 'rgba(255, 165, 0, 0.15)',
                                color: 'orange',
                                border: '1px solid rgba(255, 165, 0, 0.3)'
                            }}>
                                {t('unofficial')}
                            </span>
                        </p>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <tr>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('rank')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('player')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('rate')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('trophies')}</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>{t('tournaments')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...stats]
                                .filter(s => s.tournamentsPlayed > 0)
                                .sort((a, b) => {
                                    const rateA = a.tournamentsWon / a.tournamentsPlayed;
                                    const rateB = b.tournamentsWon / b.tournamentsPlayed;
                                    if (rateB !== rateA) return rateB - rateA;
                                    return b.tournamentsWon - a.tournamentsWon;
                                })
                                .map((s, idx) => {
                                    const rate = Math.round((s.tournamentsWon / s.tournamentsPlayed) * 100);

                                    return (
                                        <tr key={s.id} style={{
                                            borderBottom: '1px solid var(--color-border)',
                                            background: 'transparent'
                                        }}>
                                            <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', color: 'var(--color-text-dim)', fontSize: '1rem', fontFamily: '"Outfit", sans-serif' }}>
                                                {idx + 1}.
                                            </td>
                                            <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', fontSize: '1rem' }}>
                                                {s.name}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', color: rate >= 50 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                                                {rate}%
                                            </td>
                                            <td style={{ padding: 'var(--spacing-4)' }}>{s.tournamentsWon}</td>
                                            <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)' }}>{s.tournamentsPlayed}</td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Uptime Graph */}
            {uptimeData.heartbeats.length > 0 && (
                <div className="glass-panel" style={{ overflow: 'hidden', marginTop: 'var(--spacing-12)', padding: '0', border: '1px solid var(--color-border)' }}>
                    <UptimeGraph
                        heartbeats={uptimeData.heartbeats}
                        uptime24h={uptimeData.uptime24h}
                        maintenanceList={uptimeData.maintenanceList}
                    />
                </div>
            )}
        </div>
    );
}
