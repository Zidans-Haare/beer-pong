import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PasskeySettings from './passkey-settings';
import Link from 'next/link';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Get user's passkeys
  const passkeys = await prisma.passkey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      friendlyName: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-6)' }}>
      <Link
        href="/"
        className="btn btn-secondary"
        style={{ marginBottom: 'var(--spacing-6)', display: 'inline-block' }}
      >
        &larr; Zurück
      </Link>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 'var(--spacing-8)' }}>
        Einstellungen
      </h1>

      <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: '1.2rem' }}>
          Sicherheit
        </h2>

        <PasskeySettings passkeys={passkeys} />
      </div>
    </div>
  );
}
