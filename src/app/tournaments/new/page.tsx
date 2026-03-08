import CreateTournamentForm from './form';
import { getPlayers } from '@/app/actions/players';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NewTournamentPage() {
    const [players, session] = await Promise.all([getPlayers(), auth()]);
    const hostPlayer = session?.user?.id
        ? await prisma.player.findUnique({ where: { userId: session.user.id }, select: { id: true } })
        : null;

    return (
        <div className="container">
            <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-8)', textAlign: 'center' }}>Neues Turnier Planen</h1>
            <CreateTournamentForm players={players} hostPlayerId={hostPlayer?.id ?? null} />
        </div>
    );
}
