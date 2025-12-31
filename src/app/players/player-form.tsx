'use client';

import { useRef } from 'react';
import { createPlayer } from '@/app/actions/players';

export default function PlayerForm() {
    const formRef = useRef<HTMLFormElement>(null);

    async function clientAction(formData: FormData) {
        const result = await createPlayer(formData);
        if (result.success) {
            formRef.current?.reset();
        } else {
            alert('Fehler beim Erstellen des Spielers');
        }
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', marginBottom: 'var(--spacing-8)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-primary)' }}>Neuen Spieler anlegen</h3>
            <form ref={formRef} action={clientAction} style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Name *</label>
                    <input type="text" name="name" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} placeholder="Max Mustermann" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Spitzname</label>
                    <input type="text" name="nickname" style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} placeholder="Der Zerstörer" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Profilbild (URL)</label>
                        <input type="url" name="image" style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} placeholder="https://..." />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Motto / Slogan</label>
                        <input type="text" name="motto" style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} placeholder="Immer rein da!" />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Über mich (Bio)</label>
                    <textarea name="bio" rows={3} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} placeholder="Beerpong Legende seit 1999..." />
                </div>

                <hr style={{ borderColor: 'var(--color-border)', margin: 'var(--spacing-2) 0' }} />

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', color: 'var(--color-error)' }}>Admin-Code *</label>
                    <input type="password" name="adminCode" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-sm)' }} />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--spacing-4)' }}>
                    Spieler Anlegen
                </button>
            </form>
        </div>
    );
}
