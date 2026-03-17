
import LiveTournamentWidget from '@/components/dashboard/LiveTournamentWidget';
import DashboardStatsWidget from '@/components/dashboard/DashboardStatsWidget';
import InstallPrompt from '@/components/InstallPrompt';
import HeroSection from '@/components/dashboard/HeroSection';
import RecentMatchesWidget from '@/components/dashboard/RecentMatchesWidget';
import OnlineIndicator from '@/components/OnlineIndicator';
import DrunkModeToggle from '@/components/DrunkModeToggle';
import DrunkModeConditional from '@/components/DrunkModeConditional';
import { getAllPlayerStats } from '@/lib/stats';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();
  const stats = await getAllPlayerStats();

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>

      <HeroSection userName={session?.user?.name} />

      <div style={{ marginTop: 'var(--spacing-4)', marginBottom: 'var(--spacing-2)' }}>
        <DrunkModeToggle />
      </div>

      <DrunkModeConditional show="sober">
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-6)', marginBottom: 'var(--spacing-6)' }}>
          <OnlineIndicator />
        </div>
      </DrunkModeConditional>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 'var(--spacing-6)',
        marginTop: 'var(--spacing-6)'
      }}>
        {/* Install Prompt */}
        <InstallPrompt />

        {/* Live Widget - immer sichtbar */}
        <LiveTournamentWidget />

        {/* Stats + Recent — nur nüchtern */}
        <DrunkModeConditional show="sober">
          <DashboardStatsWidget stats={stats} />
          <RecentMatchesWidget />
        </DrunkModeConditional>
      </div>
    </div>
  );
}
