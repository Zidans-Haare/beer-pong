import CreateTournamentForm from './form';
import { getPlayers } from '@/app/actions/players';

export const dynamic = 'force-dynamic';

export default async function NewTournamentPage() {
    const players = await getPlayers();
    return (
        <div className="container">
            <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-8)', textAlign: 'center' }}>Neues Turnier Planen</h1>
            <CreateTournamentForm players={players} />
        </div>
    );
}
