import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Bier Pong',
  description: 'Manage your beer pong tournaments professionally.',
  manifest: '/manifest.json',
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="layout-shell">
          <Navbar />
          {/* Sidebar/Nav will go here later */}
          <main className="main-content">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
