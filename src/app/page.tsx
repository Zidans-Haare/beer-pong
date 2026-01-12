import Link from 'next/link';
import LiveTournamentWidget from '@/components/dashboard/LiveTournamentWidget';
import DashboardStatsWidget from '@/components/dashboard/DashboardStatsWidget';
import { getAllPlayerStats } from '@/lib/stats';

export default async function Home() {
  const stats = await getAllPlayerStats();

  return (
    <div className="container" style={{ paddingTop: 'calc(var(--spacing-12) + 20px)' }}>
      <header style={{ marginBottom: 'var(--spacing-8)', paddingLeft: 'var(--spacing-2)' }}>
        <h1 className="title-display" style={{ fontSize: '2.5rem', lineHeight: 1 }}>
          BIER PONG
        </h1>
        <div className="subtitle">TOURNAMENT APP</div>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 'var(--spacing-6)'
      }}>
        {/* Live Widget */}
        <LiveTournamentWidget />

        {/* Stats Widget */}
        <DashboardStatsWidget stats={stats} />

        {/* Quick Actions / Navigation Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-2)' }}>
          <Link href="/tournaments" className="glass-panel" style={{ padding: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ color: 'var(--color-primary)' }}>
              {/* Dynamically imported or standard icons? Let's use standard for now but we need to import them high up */}
              {/* Since this is a server component, we need to import icons. */}
              {/* Wait, Next.js server components can render Lucide icons directly. */}
            </span>
            {/* Note: I need to add imports to the top of page.tsx first. I'll do this in a separate edit block or include it here if I can see the top. I can't see the top in this replace block easily. 
                 Actually, I should replace the import block first or use the multi_replace tool. 
                 Let's stick to simple replacement for now, I will add imports in a second step.
              */}
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>Turniere</span>
          </Link>
          <Link href="/players" className="glass-panel" style={{ padding: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>Spieler</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
