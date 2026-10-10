
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
import { getTranslations } from 'next-intl/server';
import { getActiveWrapped } from '@/lib/wrapped-server';
import WrappedBanner from '@/components/wrapped/WrappedBanner';

export default async function Home() {
  const session = await auth();
  const stats = await getAllPlayerStats();
  // Rückblick-Hinweis nur für angemeldete Nutzer, solange einer veröffentlicht ist
  const wrapped = session?.user?.id ? await getActiveWrapped().catch(() => null) : null;
  const tw = wrapped ? await getTranslations('wrapped') : null;

  return (
    <div className="container">

      <HeroSection userName={session?.user?.name} />

      {wrapped && tw && <WrappedBanner title={tw('bannerTitle', { title: wrapped.title })} text={tw('bannerText')} cta={tw('bannerCta')} />}

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
