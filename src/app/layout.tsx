import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Beer Pong Manager',
  description: 'Manage your beer pong tournaments professionally.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <div className="layout-shell">
          <Navbar />
          {/* Sidebar/Nav will go here later */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
