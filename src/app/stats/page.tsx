import { getAllPlayerStats } from '@/lib/stats';
import type { StatsPeriod } from '@/lib/stats';
import StatsCharts from '@/components/StatsCharts';
import { Trophy, Medal, Crown, Zap } from 'lucide-react';
import RankingFormulaInfo from '@/components/RankingFormulaInfo';
import StatsFilterBar from '@/components/StatsFilterBar';
import { getPlayers } from '@/app/actions/players';
import UptimeGraph from '@/components/UptimeGraph';
import { prisma } from '@/lib/prisma';

async function syncAndGetUptimeData() {
    const url = process.env.UPTIME_KUMA_URL ?? 'https://status.olomek.com';
    const slug = process.env.UPTIME_KUMA_SLUG ?? 'bier';

    // Live-Daten holen (inkl. aktuelle Status/Maintenance)
    let liveHeartbeats: any[] = [];
    let maintenanceList: any[] = [];
    let uptime24h = 1;
    try {
        const [heartbeatRes, statusRes] = await Promise.all([
            fetch(`${url}/api/status-page/heartbeat/${slug}`, { cache: 'no-store' }),
            fetch(`${url}/api/status-page/${slug}`, { cache: 'no-store' }),
        ]);
        if (heartbeatRes.ok) {
            const data = await heartbeatRes.json();
            const monitorId = Object.keys(data.heartbeatList ?? {})[0];
            liveHeartbeats = monitorId ? (data.heartbeatList[monitorId] ?? []) : [];
            uptime24h = monitorId ? (data.uptimeList?.[`${monitorId}_24`] ?? 1) : 1;
        }
        if (statusRes.ok) {
            const data = await statusRes.json();
            maintenanceList = data.maintenanceList ?? [];
        }
    } catch { /* API nicht erreichbar */ }

    // Neue Heartbeats in DB speichern (upsert by time)
    if (liveHeartbeats.length > 0) {
        await Promise.allSettled(liveHeartbeats.map((hb: any) =>
            prisma.uptimeHeartbeat.upsert({
                where: { time: new Date(hb.time) },
                create: { time: new Date(hb.time), status: hb.status, ping: hb.ping ?? 0, msg: hb.msg ?? '' },
                update: {},
            })
        ));
        // Einträge älter als 7 Tage löschen
        await prisma.uptimeHeartbeat.deleteMany({
            where: { time: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        });
    }

    // Alle gespeicherten Daten aus DB lesen (letzte 7 Tage)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stored = await prisma.uptimeHeartbeat.findMany({
        where: { time: { gte: since } },
        orderBy: { time: 'asc' },
    });

    const heartbeats = stored.map(h => ({
        status: h.status,
        time: h.time.toISOString().replace('T', ' ').slice(0, 23),
        msg: h.msg,
        ping: h.ping,
    }));

    return { heartbeats, uptime24h, maintenanceList };
}

export const dynamic = 'force-dynamic';

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ ranked?: string; period?: string; players?: string }> }) {
    const { ranked, period, players: playersParam } = await searchParams;
    const onlyRanked = ranked !== 'false';
    const activePeriod = (['month', 'last5', 'year', 'all'].includes(period ?? '') ? period : 'all') as StatsPeriod;
    const selectedPlayerIds = playersParam ? playersParam.split(',').filter(Boolean) : [];

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
                <h1 className="title-display" style={{ fontSize: '2rem' }}>Statistiken</h1>
                <p className="subtitle" style={{ fontSize: '0.9rem' }}>Daten, Fakten & Legenden</p>
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
                    {onlyRanked ? 'Nur Liga-Turniere (keine Spaß-Turniere)' : 'Alle Turniere (inkl. Spaß-Turniere)'}
                </div>
            </header>

            <StatsFilterBar
                onlyRanked={onlyRanked}
                activePeriod={activePeriod}
                selectedPlayerIds={selectedPlayerIds}
                allPlayers={allPlayers}
            />

            <StatsCharts stats={stats} />

            <div className="glass-panel" style={{ overflow: 'hidden', marginTop: 'var(--spacing-12)', padding: '0' }}>
                <div style={{ padding: 'var(--spacing-6)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} color="var(--color-primary)" />
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Ewige Tabelle</h2>
                    </div>
                    <RankingFormulaInfo />
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <tr>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>RANG</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>SPIELER</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>SIEGE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>SPIELE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>WIN RATE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>+/-</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>POKALE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>Ø / TURNIER</th>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {s.tournamentsWon > 0 ? (
                                                    <>
                                                        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{s.tournamentsWon}</span>
                                                        <span style={{ display: 'inline-flex', gap: '2px' }}>{Array.from({ length: Math.min(s.tournamentsWon, 3) }).map((_, i) => <Trophy key={i} size={14} color="#b45309" />)}</span>
                                                        {s.tournamentsWon > 3 && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>+{s.tournamentsWon - 3}</span>}
                                                    </>
                                                ) : '-'}
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
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Turnier-Effizienz</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 'var(--spacing-1) 0 0 0' }}>
                            Verhältnis von gewonnenen zu gespielten Turnieren
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
                                Inoffiziell
                            </span>
                        </p>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <tr>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>RANG</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>SPIELER</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>QUOTE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>POKALE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>TURNIERE</th>
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
