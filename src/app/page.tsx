
import LiveTournamentWidget from '@/components/dashboard/LiveTournamentWidget';
import DashboardStatsWidget from '@/components/dashboard/DashboardStatsWidget';
import InstallPrompt from '@/components/InstallPrompt';
import { getAllPlayerStats } from '@/lib/stats';

export default async function Home() {
  const stats = await getAllPlayerStats();

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <header style={{ marginBottom: 'var(--spacing-4)', paddingLeft: 'var(--spacing-2)' }}>
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
        {/* Install Prompt */}
        <InstallPrompt />

        {/* Live Widget */}
        <LiveTournamentWidget />

        {/* Stats Widget */}
        <DashboardStatsWidget stats={stats} />


      </div>
    </div>
  );
}
