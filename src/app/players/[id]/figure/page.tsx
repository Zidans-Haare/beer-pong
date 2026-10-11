import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { figureFor, isMoonzy, normalizeFigure } from '@/lib/figure';
import FigureEditor from '@/components/figure/FigureEditor';

export const dynamic = 'force-dynamic';

// Eigene Figur gestalten: erscheint in Siegerehrung, Turnierfilm, Wrapped, Duellen und Minispiel
export default async function FigurePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    const t = await getTranslations('figure');
    const player = await prisma.player.findUnique({ where: { id }, select: { id: true, name: true, userId: true, figure: true } });
    if (!player) notFound();
    if (player.userId !== session.user.id) {
        return (
            <div className="container page-content" style={{ textAlign: 'center', marginTop: '100px' }}>
                <h1 style={{ color: 'var(--color-danger)' }}>{t('forbiddenTitle')}</h1>
                <p>{t('forbiddenText')}</p>
            </div>
        );
    }
    const saved = normalizeFigure(player.figure);
    return (
        <div className="container page-content" style={{ paddingBottom: '100px' }}>
            <Link href="/players" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>&larr; {t('back')}</Link>
            <h1 className="title-display" style={{ fontSize: '2.2rem' }}>{t('title')}</h1>
            <p className="figure-lead">{t('lead')}</p>
            <FigureEditor name={player.name.trim()} initial={figureFor(player.name, saved ? { [player.name.trim().toLowerCase()]: saved } : null)} custom={!!saved} lockedSkin={isMoonzy(player.name)} />
        </div>
    );
}
