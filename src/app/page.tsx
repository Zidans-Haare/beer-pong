
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
import { getActiveWrapped, WRAPPED_HOME_DAYS } from '@/lib/wrapped-server';
import { prisma } from '@/lib/prisma';
import WrappedBanner from '@/components/wrapped/WrappedBanner';

export default async function Home() {
  const session = await auth();
  const stats = await getAllPlayerStats();
  // Rückblick-Hinweis nur für angemeldete Nutzer, solange einer veröffentlicht ist
  const wrapped = session?.user?.id ? await getActiveWrapped().catch(() => null) : null;
  const tw = wrapped ? await getTranslations('wrapped') : null;
  const view = wrapped && session?.user?.id
    ? await prisma.wrappedView.findUnique({ where: { wrappedId_userId: { wrappedId: wrapped.id, userId: session.user.id } } }).catch(() => null)
    : null;
  // nach dem Ansehen bleibt der Hinweis noch eine Woche ruhig stehen, danach liegt er auf der Statistik-Seite
  const wrappedExpired = !!view && Date.now() - view.seenAt.getTime() > WRAPPED_HOME_DAYS * 24 * 60 * 60 * 1000;

  return (
    <div className="container">

      <HeroSection userName={session?.user?.name} />

      {wrapped && tw && !wrappedExpired && (
        <WrappedBanner seen={!!view} title={view ? wrapped.title : tw('bannerTitle', { title: wrapped.title })} text={view ? tw('bannerSeenText') : tw('bannerText')} cta={view ? tw('bannerSeenCta') : tw('bannerCta')} />
      )}

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
