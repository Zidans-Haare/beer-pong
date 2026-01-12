import { prisma } from '@/lib/prisma';
import { Users, Trophy, Radio } from 'lucide-react';

async function getStats() {
    const userCount = await prisma.user.count();
    const tournamentCount = await prisma.tournament.count();
    const recentNotifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } }
    });

    return { userCount, tournamentCount, recentNotifications };
}

export default async function AdminDashboard() {
    const stats = await getStats();

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header style={{ marginBottom: 'var(--spacing-4)' }}>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>Dashboard</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>Willkommen zurück, Boss.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-4)' }}>
                <div className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '50%', color: '#60a5fa', marginBottom: 'var(--spacing-3)' }}>
                        <Users size={24} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.userCount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</div>
                </div>

                <div className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '50%', color: '#c084fc', marginBottom: 'var(--spacing-3)' }}>
                        <Trophy size={24} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.tournamentCount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Turniere</div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 'var(--spacing-4)' }}>Letzte Aktivitäten</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    {stats.recentNotifications.map(n => (
                        <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{n.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>an {n.user?.name || 'Unknown'}</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                {new Date(n.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
