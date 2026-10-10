import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { getActiveWrapped, loadWrapped } from '@/lib/wrapped-server';
import { buildScene } from '@/lib/wrapped';
import { getCurrentSeason, accentCssVariables, DEFAULT_ACCENT } from '@/lib/seasons';
import WrappedStory from '@/components/wrapped/WrappedStory';

export const dynamic = 'force-dynamic';

export default async function WrappedPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; title?: string; at?: string }> }) {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    const { from, to, title, at } = await searchParams;
    const t = await getTranslations('wrapped');

    // Vorschau über Zeitraum in der URL ist nur für den Admin
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const preview = isAdmin(session.user.email) && fromDate && toDate && !isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())
        ? { title: (title ?? '').trim().slice(0, 60) || t('brand'), startDate: fromDate, endDate: toDate }
        : null;
    const wrapped = preview ?? await getActiveWrapped();

    const empty = (message: string) => (
        <div className="container page-content" style={{ textAlign: 'center', paddingTop: '64px' }}>
            <h1 className="title-display" style={{ fontSize: '2rem' }}>{t('brand')}</h1>
            <p style={{ color: 'var(--color-text-dim)', margin: '12px 0 24px' }}>{message}</p>
            <Link href="/" className="btn btn-primary">{t('backHome')}</Link>
        </div>
    );

    if (!wrapped) return empty(t('notPublished'));

    const [player, season] = await Promise.all([
        prisma.player.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
        getCurrentSeason().catch(() => null),
    ]);
    const data = player ? (await loadWrapped({ start: wrapped.startDate, end: wrapped.endDate })).get(player.id) : undefined;
    if (!data) return empty(t('noGames'));

    const primary = accentCssVariables(season?.accentColor ?? DEFAULT_ACCENT)['--color-primary'];
    const model = buildScene(data, wrapped.title, primary, (key, values) => t(key, values), await getLocale());
    // ?at=<Millisekunden> hält die Vorschau an einer Stelle an (nur Admin-Vorschau)
    const startAt = preview && at && !isNaN(Number(at)) ? Number(at) : undefined;

    return <WrappedStory model={model} initialTime={startAt} />;
}
