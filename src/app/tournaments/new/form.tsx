'use client';

import { createTournament } from '@/app/actions/tournaments';
import { useRouter } from 'next/navigation';

import { Player } from '@prisma/client';

export default function CreateTournamentForm({ players }: { players: Player[] }) {
    const router = useRouter();

    async function clientAction(formData: FormData) {
        const result = await createTournament(formData);
        if (result.success) {
            router.push(result.redirectUrl || '/tournaments');
            router.refresh();
        } else {
            alert('Fehler: ' + result.error);
        }
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', maxWidth: '600px', margin: '0 auto' }}>
            <form action={clientAction} style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Name des Turniers</label>
                    <input type="text" name="name" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} placeholder="z.B. Sommerfest 2025" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Datum & Uhrzeit</label>
                    <input type="datetime-local" name="date" required defaultValue={new Date().toISOString().slice(0, 16)} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Ort</label>
                    <input type="text" name="location" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} placeholder="z.B. Nicks Keller" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Modus</label>
                    <select name="type" style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
                        <option value="ELIMINATION">K.O. System</option>
                        <option value="ROUND_ROBIN">Jeder gegen Jeden + Finale</option>
                    </select>
                </div>

                <hr style={{ borderColor: 'var(--color-border)', margin: 'var(--spacing-2) 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <input type="checkbox" id="startImmediately" name="startImmediately" style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="startImmediately" style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}>Sofort starten (Direkte Teilnehmerwahl)</label>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Teilnehmer auswählen (Mehrfachauswahl möglich)</label>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', padding: 'var(--spacing-2)', borderRadius: 'var(--radius-sm)' }}>
                        {players.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: '4px' }}>
                                <input type="checkbox" name="participants" value={p.id} id={`p-${p.id}`} />
                                <label htmlFor={`p-${p.id}`} style={{ cursor: 'pointer' }}>{p.name}</label>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>Nur benötigt wenn "Sofort starten" gewählt ist.</p>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--spacing-4)' }}>
                    Turnier Erstellen
                </button>
            </form>
        </div>
    );
}
