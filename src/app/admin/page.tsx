import { prisma } from '@/lib/prisma';
import { getDashboardStats } from '@/app/actions/admin';
import { checkForUpdate } from '@/lib/update-check';
import { Users, Trophy, Swords, MessageSquare, User, ArrowUpCircle } from 'lucide-react';
import Link from 'next/link';

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
    const [base, extra, updateInfo] = await Promise.all([getBaseStats(), getDashboardStats(), checkForUpdate()]);

    const statCards = [
        { label: 'User', value: base.userCount, icon: Users, color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
        { label: 'Turniere', value: base.tournamentCount, icon: Trophy, color: '#c084fc', bg: 'rgba(168,85,247,0.15)' },
        { label: 'Spieler', value: extra.playerCount, icon: User, color: '#4ade80', bg: 'rgba(34,197,94,0.15)' },
        { label: 'Spiele', value: extra.matchCount, icon: Swords, color: '#fb923c', bg: 'rgba(249,115,22,0.15)' },
        { label: 'Chat', value: extra.chatCount, icon: MessageSquare, color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
    ];

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header style={{ marginBottom: 'var(--spacing-4)' }}>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>Dashboard</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>Willkommen zurück, Boss.</p>
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
                    color: '#60a5fa',
                }}>
                    <ArrowUpCircle size={20} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>Update verfügbar: v{updateInfo.latestVersion}</span>
                        <span style={{ color: 'var(--color-text-dim)', marginLeft: '8px', fontSize: '0.85rem' }}>
                            (aktuell: v{updateInfo.currentVersion})
                        </span>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                            {process.env.DEPLOY_SECRET
                                ? <>GitHub Webhook aktiv — pushe auf <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>main</code> zum Deployen.</>
                                : <>Manuell: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>bash ~/beer-pong/scripts/update.sh</code></>
                            }
                        </div>
                    </div>
                    <Link
                        href={updateInfo.releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.82rem', color: '#60a5fa', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                    >
                        Release Notes
                    </Link>
                </div>
            )}

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--spacing-3)' }}>
                {statCards.map(card => (
                    <div key={card.label} className="glass-panel" style={{ padding: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--spacing-2)' }}>
                        <div style={{ padding: '10px', background: card.bg, borderRadius: '50%', color: card.color }}>
                            <card.icon size={20} />
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', lineHeight: 1 }}>{card.value}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-6)' }}>
                {/* Top Spieler */}
                <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Swords size={16} color="var(--color-primary)" /> Aktivste Spieler
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
                                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-dim)' }}>{total} Spiele</span>
                                </div>
                            );
                        })}
                        {extra.topPlayers.length === 0 && <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>Noch keine Spieldaten.</p>}
                    </div>
                </div>

                {/* Letzte Aktivitäten */}
                <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--spacing-4)' }}>Letzte Aktivitäten</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                        {base.recentNotifications.map((n: (typeof base.recentNotifications)[number], i: number) => (
                            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-2) 0', borderBottom: i < base.recentNotifications.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                <div>
                                    <div style={{ fontSize: '0.88rem', color: 'var(--color-text)' }}>{n.title}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>an {n.user?.name ?? 'Unbekannt'}</div>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                    {new Date(n.createdAt).toLocaleDateString('de-DE')}
                                </div>
                            </div>
                        ))}
                        {base.recentNotifications.length === 0 && <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>Keine Aktivitäten.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
