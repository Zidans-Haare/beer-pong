
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
    <div className="container">

      <HeroSection userName={session?.user?.name} />

      <div className="home-tools">
        <DrunkModeToggle />
        <DrunkModeConditional show="sober">
          <OnlineIndicator />
        </DrunkModeConditional>
      </div>

      <div className="home-feed">
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
