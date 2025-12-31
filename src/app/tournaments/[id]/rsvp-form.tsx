'use client';

import { submitRSVP } from '@/app/actions/rsvp';
import { Player } from '@prisma/client';

export default function RSVPForm({
    tournamentId,
    players,
    currentRsvps
}: {
    tournamentId: string;
    players: Player[];
    currentRsvps: any[];
}) {
    async function action(formData: FormData) {
        await submitRSVP(formData);
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-4)' }}>Teilnahme eintragen</h3>
            <form action={action} style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                <input type="hidden" name="tournamentId" value={tournamentId} />

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-1)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)' }}>Spieler</label>
                    <select name="playerId" style={{ width: '100%', padding: 'var(--spacing-2)', background: 'black', color: 'white', border: '1px solid var(--color-border)' }}>
                        {players.map(p => {
                            const rsvp = currentRsvps.find(r => r.playerId === p.id);
                            const statusLabel = rsvp ? `(${rsvp.status})` : '';
                            return <option key={p.id} value={p.id}>{p.name} {statusLabel}</option>
                        })}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-1)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)' }}>Status</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <button type="submit" name="status" value="YES" className="btn" style={{ flex: 1, background: 'rgba(0, 255, 157, 0.2)', color: '#00ff9d', border: '1px solid #00ff9d' }}>Dabei</button>
                        <button type="submit" name="status" value="MAYBE" className="btn" style={{ flex: 1, background: 'rgba(255, 165, 0, 0.2)', color: 'orange', border: '1px solid orange' }}>Vielleicht</button>
                        <button type="submit" name="status" value="NO" className="btn" style={{ flex: 1, background: 'rgba(255, 0, 85, 0.2)', color: '#ff0055', border: '1px solid #ff0055' }}>Absage</button>
                    </div>
                </div>
            </form>
        </div>
    );
}
