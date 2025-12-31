
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import EditPlayerForm from './form';

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const player = await prisma.player.findUnique({ where: { id } });

    if (!player) {
        notFound();
    }

    if (player.userId !== session.user.id) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
                <h1 style={{ color: 'var(--color-danger)' }}>Keine Berechtigung</h1>
                <p>Du kannst nur dein eigenes Profil bearbeiten.</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            <h1 className="title-gradient" style={{ marginBottom: 'var(--spacing-8)' }}>Profil Bearbeiten</h1>
            <EditPlayerForm player={player} />
        </div>
    );
}
