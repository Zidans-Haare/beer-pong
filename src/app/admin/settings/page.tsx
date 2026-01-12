
import { getSystemSettings, updateSystemSettings } from '@/app/actions/admin';
import { revalidatePath } from 'next/cache';

export default async function AdminSettingsPage() {
    const settings = await getSystemSettings();

    async function handleSubmit(formData: FormData) {
        'use server';
        await updateSystemSettings(formData);
    }

    return (
        <div className="card">
            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>System-Einstellungen</h2>

            <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                <div className="form-group">
                    <label htmlFor="matchDurationMin">Standard-Spieldauer (Minuten)</label>
                    <input
                        type="number"
                        id="matchDurationMin"
                        name="matchDurationMin"
                        defaultValue={settings.matchDurationMin}
                        min="5"
                        max="120"
                        className="form-control"
                    />
                    <small style={{ color: 'var(--color-text-dim)' }}>
                        Wie lange ein Spiel voraussichtlich dauert (inkl. Aufwärmen/Wechsel).
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="tableCount">Anzahl Tische (Standard)</label>
                    <input
                        type="number"
                        id="tableCount"
                        name="tableCount"
                        defaultValue={settings.tableCount}
                        min="1"
                        max="20"
                        className="form-control"
                    />
                    <small style={{ color: 'var(--color-text-dim)' }}>
                        Wie viele Tische gleichzeitig zur Verfügung stehen.
                    </small>
                </div>

                <div style={{ marginTop: 'var(--spacing-4)' }}>
                    <button type="submit" className="btn-primary">Einstellungen speichern</button>
                </div>
            </form>

            <div style={{ marginTop: 'var(--spacing-8)', padding: 'var(--spacing-4)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-2)' }}>Info zur Zeitberechnung</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                    Diese Werte werden als Standard für neue Turniere verwendet.
                    In der Turnier-Ansicht wird daraus berechnet, wann welcher Spieler voraussichtlich an der Reihe ist.
                </p>
            </div>
        </div>
    );
}
