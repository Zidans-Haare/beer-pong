'use client';

import { updateMatchResult } from '@/app/actions/matches';
import { useState } from 'react';

export default function MatchEditForm({ match, onClose }: { match: any, onClose: () => void }) {
    const [winnerId, setWinnerId] = useState<string | null>(match.winnerId || null);
    const [loserCups, setLoserCups] = useState<string>(match.winnerId ? (match.winnerId === match.player1Id ? match.score2.toString() : match.score1.toString()) : '');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!winnerId) return alert('Bitte Gewinner auswählen');
        if (loserCups === '') return alert('Bitte Becher eingeben');

        const cups = parseInt(loserCups);
        if (isNaN(cups) || cups < 0 || cups > 10) return alert('Ungültige Becherzahl (0-10)');

        // Winner gets 10, Loser gets input
        const score1 = winnerId === match.player1Id ? 10 : cups;
        const score2 = winnerId === match.player2Id ? 10 : cups;

        await updateMatchResult(match.id, score1, score2);
        onClose();
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ padding: 'var(--spacing-8)', width: '350px' }}>
                <h3 style={{ textAlign: 'center', marginBottom: 'var(--spacing-4)' }}>Ergebnis eintragen</h3>
                <form onSubmit={handleSubmit}>
                    <p style={{ marginBottom: 'var(--spacing-2)', textAlign: 'center', color: 'var(--color-text-dim)' }}>Wer hat gewonnen?</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                        <button
                            type="button"
                            onClick={() => setWinnerId(match.player1Id)}
                            style={{
                                padding: 'var(--spacing-4)',
                                border: winnerId === match.player1Id ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                                background: winnerId === match.player1Id ? 'rgba(0,255,0,0.1)' : 'transparent',
                                color: 'white',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer'
                            }}
                        >
                            {match.player1?.name || 'Spieler 1'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setWinnerId(match.player2Id)}
                            style={{
                                padding: 'var(--spacing-4)',
                                border: winnerId === match.player2Id ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                                background: winnerId === match.player2Id ? 'rgba(0,255,0,0.1)' : 'transparent',
                                color: 'white',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer'
                            }}
                        >
                            {match.player2?.name || 'Spieler 2'}
                        </button>
                    </div>

                    {winnerId && (
                        <div style={{ marginBottom: 'var(--spacing-6)', textAlign: 'center' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>
                                Wie viele Becher hat der <strong>Verlierer</strong> getroffen?
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={loserCups}
                                onChange={e => setLoserCups(e.target.value)}
                                style={{
                                    width: '80px',
                                    padding: 'var(--spacing-3)',
                                    fontSize: '1.5rem',
                                    textAlign: 'center',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid var(--color-border)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <button type="button" onClick={onClose} className="btn" style={{ flex: 1, border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>Abbrechen</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!winnerId || loserCups === ''}>Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
