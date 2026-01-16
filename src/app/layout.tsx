import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import ServiceWorkerUpdate from '@/components/ServiceWorkerUpdate';
import ClientLayout from '@/components/ClientLayout';
import OfflineIndicator from '@/components/OfflineIndicator';
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider';

export const metadata: Metadata = {
  title: 'Bier Pong',
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
    title: 'Bier Pong',
  },
  icons: {
    icon: '/icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Enables edge-to-edge display on notched devices
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#fafafa' },
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
  ],
};

import { auth } from '@/auth';

// ... (Metadata and Viewport exports remain unchanged - handled by Next.js imports)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL;

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;700;800&display=swap" rel="stylesheet" />
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        {/* Splash Screen for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <div className="layout-shell">
          <Navbar />
          {/* Sidebar/Nav will go here later */}
          <main className="main-content">
            <ClientLayout>
              {children}
            </ClientLayout>
          </main>
          <BottomNav isAdmin={isAdmin} />
          <ServiceWorkerUpdate />
          <OfflineIndicator />
          <ServiceWorkerProvider />
        </div>
      </body>
    </html>
  );
}
