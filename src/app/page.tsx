
import LiveTournamentWidget from '@/components/dashboard/LiveTournamentWidget';
import DashboardStatsWidget from '@/components/dashboard/DashboardStatsWidget';
import InstallPrompt from '@/components/InstallPrompt';
import HeroSection from '@/components/dashboard/HeroSection';
import RecentMatchesWidget from '@/components/dashboard/RecentMatchesWidget';
import { getAllPlayerStats } from '@/lib/stats';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();
  const stats = await getAllPlayerStats();

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>

      <HeroSection userName={session?.user?.name} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 'var(--spacing-6)'
      }}>
        {/* Install Prompt */}
        <InstallPrompt />

        {/* Live Widget - Priority 1 */}
        <LiveTournamentWidget />

        {/* Stats Widget (Podium) - Priority 2 */}
        <DashboardStatsWidget stats={stats} />

        {/* Recent Matches - Priority 3 */}
        <RecentMatchesWidget />
      </div>
    </div>
  );
}
