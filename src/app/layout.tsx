import AppDialogProvider from '@/components/AppDialog';
import { getCurrentSeason, accentCss } from '@/lib/seasons';
import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import ServiceWorkerUpdate from '@/components/ServiceWorkerUpdate';
import ClientLayout from '@/components/ClientLayout';
import OfflineIndicator from '@/components/OfflineIndicator';
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider';
import PWATracker from '@/components/PWATracker';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Beer Pong';

export const metadata: Metadata = {
  title: appName,
  description: 'Manage your beer pong tournaments professionally.',
  manifest: '/manifest.json',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: appName,
  },
  icons: {
    icon: '/icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content' as const, // keyboard shrinks layout viewport (Android Chrome 108+, Firefox 132+)
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#fafbfb' },
    { media: '(prefers-color-scheme: light)', color: '#fafbfb' },
  ],
};

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DrunkModeProvider } from '@/context/DrunkModeContext';
import { isDemoMode } from '@/lib/demo';
import DemoBanner from '@/components/DemoBanner';
import DemoCtaPopup from '@/components/DemoCtaPopup';
import DemoAlertOverride from '@/components/DemoAlertOverride';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL;
  const locale = await getLocale();
  const messages = await getMessages();
  const liveStreamCount = await prisma.tournament.count({
    where: { liveStreamUrl: { not: null }, status: 'ACTIVE' },
  });
  const hasLiveStream = liveStreamCount > 0;
  // Saisonfarbe: überschreibt --color-primary & Co. der aktuellen Saison (ohne Saison bleibt das Standard-Grün)
  const currentSeason = await getCurrentSeason().catch(() => null);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* SW-Reload vor React-Hydration registrieren — verhindert verpasste controllerchange-Events
            Kein XSS-Risiko: statischer Literal-String, keine User-Daten */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',function(){window.location.reload();})}` }} />
        <link rel="preload" href="/fonts/Manrope.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/BarlowCondensed-Bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        {currentSeason && <style dangerouslySetInnerHTML={{ __html: accentCss(currentSeason.accentColor) }} />}
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        {/* Splash Screen for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Cloudflare Web Analytics */}
        <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "a9f2e384cfc2463e918d51c485fd7de4"}' />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
        <DrunkModeProvider>
        <AppDialogProvider>
        {isDemoMode && <DemoBanner />}
        <div className="layout-shell">
          <Navbar />
          {/* Sidebar/Nav will go here later */}
          <main className="main-content">
            <ClientLayout>
              {children}
            </ClientLayout>
          </main>
          <BottomNav isAdmin={isAdmin} isLoggedIn={!!session?.user} hasLiveStream={hasLiveStream} />
          <ServiceWorkerUpdate />
          <OfflineIndicator />
          <ServiceWorkerProvider />
          {session?.user?.id && <PWATracker userId={session.user.id} />}
          {isDemoMode && <DemoCtaPopup />}
        {isDemoMode && <DemoAlertOverride />}
        </div>
        </AppDialogProvider>
        </DrunkModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
