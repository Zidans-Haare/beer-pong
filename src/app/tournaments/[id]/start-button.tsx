'use client';

import { startTournament } from '@/app/actions/tournaments';

export default function StartTournamentButton({ tournamentId }: { tournamentId: string }) {
    async function action() {
        const res = await startTournament(tournamentId);
        if (!res.success) {
            alert(res.error);
        }
    }

    return (
        <form action={action}>
            <button type="submit" className="btn btn-primary" style={{ border: '2px solid var(--color-primary)' }}>
                Turnier Starten & Baum Erstellen
            </button>
        </form>
    );
}
