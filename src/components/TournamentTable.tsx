'use client';

// Helper component to render the table (Props passed from server)
// Actually we can reuse this for both valid Tournament Table and Main Stats Table partially?
// Let's make it specific for Tournament.

interface Standing {
    playerId: string;
    playerName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    points: number;
    cupDiff: number;
}

export default function TournamentTable({ standings, highlightTop = 0 }: { standings: Standing[], highlightTop?: number }) {
    if (standings.length === 0) return <p style={{ color: 'var(--color-text-dim)', textAlign: 'center' }}>Noch keine Ergebnisse.</p>;

    return (
        <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: 'var(--spacing-8)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: 'var(--spacing-3)' }}>#</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>Spieler</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>Spiele</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>S</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>N</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>Diff.</th>
                        <th style={{ padding: 'var(--spacing-3)' }}>Punkte</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => {
                        const isQualifying = i < highlightTop;
                        return (
                            <tr key={s.playerId} style={{
                                borderBottom: '1px solid var(--color-border)',
                                background: isQualifying ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                                borderLeft: isQualifying ? '4px solid var(--color-success)' : '4px solid transparent'
                            }}>
                                <td style={{ padding: 'var(--spacing-3)' }}>{i + 1}.</td>
                                <td style={{ padding: 'var(--spacing-3)', fontWeight: 'bold' }}>
                                    {s.playerName}
                                </td>
                                <td style={{ padding: 'var(--spacing-3)' }}>{s.matchesPlayed}</td>
                                <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-success)' }}>{s.wins}</td>
                                <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-error)' }}>{s.losses}</td>
                                <td style={{ padding: 'var(--spacing-3)' }}>{s.cupDiff > 0 ? `+${s.cupDiff}` : s.cupDiff}</td>
                                <td style={{ padding: 'var(--spacing-3)', fontWeight: 'bold', color: 'var(--color-primary)' }}>{s.points}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {highlightTop > 0 && (
                <div style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--color-text-dim)', textAlign: 'right' }}>
                    <span style={{ color: 'var(--color-success)', marginRight: '6px' }}>●</span>
                    Plätze 1-{highlightTop} qualifizieren sich für die K.O.-Runde
                </div>
            )}
        </div>
    );
}
