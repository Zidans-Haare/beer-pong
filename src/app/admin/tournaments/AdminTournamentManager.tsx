'use client';

import { useState, useTransition } from 'react';
import { adminAddPlayerToTournament } from '@/app/actions/admin';
import { UserPlus, Check, Search, Calendar, Users, ChevronDown } from 'lucide-react';

type Tournament = {
    id: string;
    name: string;
    date: Date | string;
    location: string;
    mode: string;
    rsvps: { player: { id: string; name: string } }[];
};

type Player = {
    id: string;
    name: string;
    nickname: string | null;
    user: { id: string; email: string | null } | null;
};

export function AdminTournamentManager({
    tournaments,
    players
}: {
    tournaments: Tournament[];
    players: Player[];
}) {
    const [selectedTournamentId, setSelectedTournamentId] = useState(tournaments[0]?.id ?? '');
    const [search, setSearch] = useState('');
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [addedPlayerIds, setAddedPlayerIds] = useState<Set<string>>(new Set());

    const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);
    const registeredPlayerIds = new Set(selectedTournament?.rsvps.map(r => r.player.id) ?? []);

    const availablePlayers = players.filter(p => {
        if (registeredPlayerIds.has(p.id) && !addedPlayerIds.has(p.id)) return false;
        if (addedPlayerIds.has(p.id)) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) ||
            (p.nickname?.toLowerCase().includes(q)) ||
            (p.user?.email?.toLowerCase().includes(q));
    });

    const alreadyRegistered = players.filter(p => registeredPlayerIds.has(p.id) || addedPlayerIds.has(p.id));

    function handleAdd(playerId: string) {
        setFeedback(null);
        startTransition(async () => {
            const result = await adminAddPlayerToTournament(playerId, selectedTournamentId);
            if (result.success) {
                setAddedPlayerIds(prev => new Set(prev).add(playerId));
                setFeedback({ type: 'success', message: `${result.playerName} wurde angemeldet!` });
                setTimeout(() => setFeedback(null), 3000);
            } else {
                setFeedback({ type: 'error', message: result.error ?? 'Fehler' });
            }
        });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
            {/* Tournament Selector */}
            <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
                    <Calendar size={16} />
                    Turnier auswählen
                </label>
                <div style={{ position: 'relative' }}>
                    <select
                        className="form-control"
                        value={selectedTournamentId}
                        onChange={(e) => {
                            setSelectedTournamentId(e.target.value);
                            setAddedPlayerIds(new Set());
                            setFeedback(null);
                        }}
                        style={{ paddingRight: '36px', appearance: 'none' }}
                    >
                        {tournaments.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name} — {new Date(t.date).toLocaleDateString('de-DE')} ({t.mode === 'TEAM' ? '2v2' : '1v1'})
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        size={16}
                        style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: 'var(--color-text-dim)'
                        }}
                    />
                </div>
            </div>

            {/* Already registered */}
            {alreadyRegistered.length > 0 && (
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                        marginBottom: 'var(--spacing-3)',
                        color: 'var(--color-text-dim)',
                        fontSize: '0.85rem'
                    }}>
                        <Users size={14} />
                        <span>Bereits angemeldet ({alreadyRegistered.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                        {alreadyRegistered.map(p => (
                            <span
                                key={p.id}
                                style={{
                                    padding: '4px 12px',
                                    borderRadius: '100px',
                                    fontSize: '0.85rem',
                                    background: 'rgba(78, 205, 196, 0.15)',
                                    color: 'var(--color-secondary)',
                                    border: '1px solid rgba(78, 205, 196, 0.3)'
                                }}
                            >
                                <Check size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                {p.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Search & Add */}
            <div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    marginBottom: 'var(--spacing-3)'
                }}>
                    <UserPlus size={16} />
                    <span style={{ fontWeight: 600 }}>Spieler hinzufügen</span>
                </div>

                <div style={{ position: 'relative', marginBottom: 'var(--spacing-3)' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-dim)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Spieler suchen (Name, Nickname, E-Mail)..."
                        className="form-control"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '36px' }}
                    />
                </div>

                {/* Feedback */}
                {feedback && (
                    <div style={{
                        padding: 'var(--spacing-3)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 'var(--spacing-3)',
                        fontSize: '0.9rem',
                        background: feedback.type === 'success'
                            ? 'rgba(78, 205, 196, 0.1)'
                            : 'rgba(255, 107, 107, 0.1)',
                        border: `1px solid ${feedback.type === 'success' ? 'var(--color-secondary)' : 'var(--color-accent)'}`,
                        color: feedback.type === 'success' ? 'var(--color-secondary)' : 'var(--color-accent)'
                    }}>
                        {feedback.message}
                    </div>
                )}

                {/* Player List */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-2)',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    {availablePlayers.length === 0 ? (
                        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', textAlign: 'center', padding: 'var(--spacing-4)' }}>
                            {search ? 'Kein Spieler gefunden.' : 'Alle Spieler sind bereits angemeldet.'}
                        </p>
                    ) : (
                        availablePlayers.map(player => (
                            <div
                                key={player.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 'var(--spacing-3)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-surface)'
                                }}
                            >
                                <div>
                                    <span style={{ fontWeight: 500 }}>{player.name}</span>
                                    {player.nickname && (
                                        <span style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', marginLeft: '8px' }}>
                                            ({player.nickname})
                                        </span>
                                    )}
                                    {player.user?.email && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                            {player.user.email}
                                        </div>
                                    )}
                                </div>
                                <button
                                    className="btn-primary"
                                    onClick={() => handleAdd(player.id)}
                                    disabled={isPending}
                                    style={{
                                        padding: '6px 14px',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <UserPlus size={14} />
                                    Anmelden
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
