import { prisma } from '@/lib/prisma';
import { getDashboardStats } from '@/app/actions/admin';
import { checkForUpdate } from '@/lib/update-check';
import { Users, Trophy, Swords, MessageSquare, User, ArrowUpCircle } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

async function getBaseStats() {
    const [userCount, tournamentCount] = await Promise.all([
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.tournament.count(),
    ]);
    const recentNotifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } },
    });
    return { userCount, tournamentCount, recentNotifications };
}

export default async function AdminDashboard() {
    const [base, extra, updateInfo, t] = await Promise.all([getBaseStats(), getDashboardStats(), checkForUpdate(), getTranslations('admin.dashboard')]);

    const statCards = [
        { label: 'User', value: base.userCount, icon: Users, color: "#28647a", bg: "rgba(40,100,122,0.15)" },
        { label: t('statTournaments'), value: base.tournamentCount, icon: Trophy, color: "#006b50", bg: "rgba(0,107,80,0.15)" },
        { label: t('statPlayers'), value: extra.playerCount, icon: User, color: "#08754b", bg: 'rgba(34,197,94,0.15)' },
        { label: t('statMatches'), value: extra.matchCount, icon: Swords, color: "#94600b", bg: 'rgba(249,115,22,0.15)' },
        { label: 'Chat', value: extra.chatCount, icon: MessageSquare, color: "#28647a", bg: 'rgba(56,189,248,0.15)' },
    ];

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header style={{ marginBottom: 'var(--spacing-4)' }}>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>Dashboard</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>{t('welcome')}</p>
            </header>

            {/* Update Banner */}
            {updateInfo?.hasUpdate && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-3)',
                    padding: 'var(--spacing-4) var(--spacing-5)',
                    background: 'rgba(96,165,250,0.1)',
                    border: '1px solid rgba(96,165,250,0.3)',
                    borderRadius: '10px',
                    color: "#28647a",
                }}>
                    <ArrowUpCircle size={20} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>{t('updateAvailable', { version: updateInfo.latestVersion })}</span>
                        <span style={{ color: 'var(--color-text-dim)', marginLeft: '8px', fontSize: '0.85rem' }}>
                            {t('currentVersion', { version: updateInfo.currentVersion })}
                        </span>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                            {process.env.DEPLOY_SECRET
                                ? <>{t('webhookActive')} <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>main</code> {t('webhookActiveSuffix')}</>
                                : <>{t('manualUpdate')} <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>bash ~/beer-pong/scripts/update.sh</code></>
                            }
                        </div>
                    </div>
                    <Link
                        href={updateInfo.releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.82rem', color: "#28647a", textDecoration: 'underline', whiteSpace: 'nowrap' }}
                    >
                        Release Notes
                    </Link>
                </div>
            )}

            {/* Stats Grid */}
            <div className="admin-stat-grid">
                {statCards.map(card => (
                    <div key={card.label} className="admin-stat">
                        <div className="admin-stat-label"><card.icon size={18} />{card.label}</div>
                        <div className="score">{card.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 'var(--spacing-6)' }}>
                {/* Top Spieler */}
                <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Swords size={16} color="var(--color-primary)" /> {t('topPlayers')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                        {extra.topPlayers.map((p: (typeof extra.topPlayers)[number], i: number) => {
                            const total = p._count.matchesAsPlayer1 + p._count.matchesAsPlayer2;
                            return (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-2) 0', borderBottom: i < extra.topPlayers.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: 700, minWidth: '16px' }}>{i + 1}.</span>
                                        <Link href={`/players/${p.id}`} style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)', textDecoration: 'none' }}>
                                            {p.name}
                                        </Link>
                                    </div>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-dim)' }}>{total} {t('games')}</span>
                                </div>
                            );
                        })}
                        {extra.topPlayers.length === 0 && <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>{t('noMatchData')}</p>}
                    </div>
                </section>

                {/* Letzte Aktivitäten */}
                <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--spacing-4)' }}>{t('recentActivity')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                        {base.recentNotifications.map((n: (typeof base.recentNotifications)[number], i: number) => (
                            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-2) 0', borderBottom: i < base.recentNotifications.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                <div>
                                    <div style={{ fontSize: '0.88rem', color: 'var(--color-text)' }}>{n.title}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>{t('to', { name: n.user?.name ?? '?' })}</div>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                    {new Date(n.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                        {base.recentNotifications.length === 0 && <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>{t('noActivity')}</p>}
                    </div>
                </section>
            </div>
        </div>
    );
}
