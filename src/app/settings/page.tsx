import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PasskeySettings from './passkey-settings';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default async function SettingsPage() {
  const t = await getTranslations('settings');
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
    <div className="container page-content" style={{ paddingTop: 'var(--spacing-6)' }}>
      <Link
        href="/"
        className="btn btn-quiet"
        style={{ marginBottom: '16px' }}
      >
        <ArrowLeft size={18} />{t('back')}
      </Link>

      <PageHeader title={t('title')} />

      <section className="form-section">
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: '1.2rem' }}>
          <ShieldCheck size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--color-primary)' }} />{t('security')}
        </h2>

        <PasskeySettings passkeys={passkeys} />
      </section>
    </div>
  );
}
