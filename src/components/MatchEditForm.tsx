'use client';

import { updateMatchResult } from '@/app/actions/matches';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTeamDisplayName } from '@/lib/team-utils';
import { ChevronLeft, RefreshCw } from 'lucide-react';

export default function MatchEditForm({ match, onClose }: { match: any, onClose: () => void }) {
    const router = useRouter();
    const isTeamMatch = !!match.team1Id && !!match.team2Id;

    // For team matches: use winnerTeamId, for solo: use winnerId
    const currentWinner = isTeamMatch ? match.winnerTeamId : match.winnerId;
    const [winnerId, setWinnerId] = useState<string | null>(currentWinner || null);

    // Reconstruct state from existing scores
    const getInitialState = () => {
        if (!currentWinner) return { cups: null as number | null, ot: false, otRounds: 0, otLoserCups: null as number | null };
        const loserScore = isTeamMatch
            ? (currentWinner === match.team1Id ? match.score2 : match.score1)
            : (currentWinner === match.player1Id ? match.score2 : match.score1);
        if (loserScore < 10) return { cups: loserScore, ot: false, otRounds: 0, otLoserCups: null };
        // OT: loserScore = 10 + completedOtRounds*3 + otLoserCups
        const above10 = loserScore - 10;
        const completedOtRounds = Math.floor(above10 / 3);
        const otLC = above10 % 3;
        return { cups: null, ot: true, otRounds: completedOtRounds, otLoserCups: otLC };
    };
    const init = getInitialState();
    const [loserCupsStr, setLoserCupsStr] = useState<string>(init.cups !== null ? init.cups.toString() : '');
    const [isOT, setIsOT] = useState(init.ot);
    const [otRounds, setOtRounds] = useState(init.otRounds);
    const [otLoserCups, setOtLoserCups] = useState<number | null>(init.otLoserCups);

    // Get display names
    const team1Name = match.team1 ? getTeamDisplayName(match.team1) : 'Team 1';
    const team2Name = match.team2 ? getTeamDisplayName(match.team2) : 'Team 2';
    const player1Name = match.player1?.name || 'Spieler 1';
    const player2Name = match.player2?.name || 'Spieler 2';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!winnerId) return alert('Bitte Gewinner auswählen');
        const loserCups = parseInt(loserCupsStr);
        if (!isOT && (loserCupsStr === '' || isNaN(loserCups) || loserCups < 0 || loserCups > 9)) return alert('Bitte Becherzahl eingeben (0–9)');
        if (isOT && otLoserCups === null) return alert('Bitte OT-Becherzahl eingeben');

        const isTeam1Winner = isTeamMatch ? winnerId === match.team1Id : winnerId === match.player1Id;

        let winnerScore: number;
        let loserScore: number;
        if (!isOT) {
            winnerScore = 10;
            loserScore = loserCups;
        } else {
            // winner always clears all OT cups in the decisive round
            winnerScore = 10 + (otRounds + 1) * 3;
            loserScore = 10 + otRounds * 3 + otLoserCups!;
        }

        const score1 = isTeam1Winner ? winnerScore : loserScore;
        const score2 = isTeam1Winner ? loserScore : winnerScore;

        const result = await updateMatchResult(match.id, score1, score2);

        if (!result.success) {
            alert(result.error || 'Fehler beim Speichern');
            return;
        }

        onClose();
        router.refresh();
    }

    const handleWinnerClick = (id: string) => {
        setWinnerId(id);
        setLoserCupsStr('');
        setIsOT(false);
        setOtRounds(0);
        setOtLoserCups(null);
    };

    const handleOtLoserCups = (n: number) => {
        if (n === 3) {
            // Both hit all OT cups → next OT round
            setOtRounds(r => r + 1);
            setOtLoserCups(null);
        } else {
            setOtLoserCups(n);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ padding: 'var(--spacing-8)', width: '350px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
                <h3 style={{ textAlign: 'center', marginBottom: 'var(--spacing-4)', color: 'var(--color-text)' }}>
                    {match.isPlayed ? 'Ergebnis korrigieren' : 'Ergebnis eintragen'}
                </h3>

                <form onSubmit={handleSubmit}>
                    <p style={{ marginBottom: 'var(--spacing-2)', textAlign: 'center', color: 'var(--color-text-dim)' }}>Wer hat gewonnen?</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                        <button
                            type="button"
                            onClick={() => handleWinnerClick(isTeamMatch ? match.team1Id : match.player1Id)}
                            style={{
                                padding: 'var(--spacing-4)',
                                border: winnerId === (isTeamMatch ? match.team1Id : match.player1Id) ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                                background: winnerId === (isTeamMatch ? match.team1Id : match.player1Id) ? 'var(--color-surface)' : 'var(--color-bg)',
                                color: 'var(--color-text)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: winnerId === (isTeamMatch ? match.team1Id : match.player1Id) ? 'bold' : 'normal'
                            }}
                        >
                            {isTeamMatch ? team1Name : player1Name}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleWinnerClick(isTeamMatch ? match.team2Id : match.player2Id)}
                            style={{
                                padding: 'var(--spacing-4)',
                                border: winnerId === (isTeamMatch ? match.team2Id : match.player2Id) ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                                background: winnerId === (isTeamMatch ? match.team2Id : match.player2Id) ? 'var(--color-surface)' : 'var(--color-bg)',
                                color: 'var(--color-text)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: winnerId === (isTeamMatch ? match.team2Id : match.player2Id) ? 'bold' : 'normal'
                            }}
                        >
                            {isTeamMatch ? team2Name : player2Name}
                        </button>
                    </div>

                    {winnerId && !isOT && (
                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-3)', color: 'var(--color-text)', textAlign: 'center' }}>
                                Becher <strong>Verlierer</strong> (0–9)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="z.B. 6"
                                value={loserCupsStr}
                                onChange={e => {
                                    const v = e.target.value.replace(/[^0-9]/g, '');
                                    if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 9)) setLoserCupsStr(v);
                                }}
                                autoFocus
                                onFocus={e => e.target.select()}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '14px',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--color-text)',
                                    marginBottom: 'var(--spacing-3)',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => { setIsOT(true); setLoserCupsStr(''); }}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '100px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text-dim)',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <RefreshCw size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                Verlängerung (beide 10)
                            </button>
                        </div>
                    )}

                    {winnerId && isOT && (
                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <div style={{
                                textAlign: 'center',
                                marginBottom: 'var(--spacing-3)',
                                padding: '6px 14px',
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid var(--color-primary)',
                                borderRadius: '100px',
                                display: 'inline-block',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: 'var(--color-primary)',
                                width: '100%',
                                boxSizing: 'border-box',
                            }}>
                                OT{otRounds > 0 ? ` Runde ${otRounds + 1}` : ''} — je 3 Becher
                            </div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-3)', color: 'var(--color-text)', textAlign: 'center', fontSize: '0.9rem' }}>
                                Becher <strong>Verlierer</strong> im OT
                                {otLoserCups !== null && (
                                    <span style={{ marginLeft: '8px', color: 'var(--color-primary)', fontWeight: 700 }}>→ {otLoserCups}</span>
                                )}
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: 'var(--spacing-3)' }}>
                                {[0,1,2].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setOtLoserCups(n)}
                                        style={{
                                            aspectRatio: '1',
                                            borderRadius: '50%',
                                            border: otLoserCups === n ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            background: otLoserCups === n ? 'var(--color-primary)' : 'var(--color-surface)',
                                            color: otLoserCups === n ? '#fff' : 'var(--color-text)',
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => handleOtLoserCups(3)}
                                    style={{
                                        aspectRatio: '1',
                                        borderRadius: '50%',
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text-dim)',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                    title="Beide treffen alle 3 → nächste OT-Runde"
                                >
                                    OT+
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setIsOT(false); setOtRounds(0); setOtLoserCups(null); }}
                                style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '100px',
                                    border: '1px solid var(--color-border)',
                                    background: 'transparent',
                                    color: 'var(--color-text-dim)',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <ChevronLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                Zurück
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <button type="button" onClick={onClose} className="btn" style={{ flex: 1, border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>Abbrechen</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!winnerId || (!isOT && loserCupsStr === '') || (isOT && otLoserCups === null)}>Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
