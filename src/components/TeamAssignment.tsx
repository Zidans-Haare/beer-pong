'use client';

import { useState, useTransition } from 'react';
import { Users, UserPlus, Shuffle, X, Check } from 'lucide-react';
import { autoAssignTeams, assignToTeam, createTeam, deleteTeam, updateTeamName } from '@/app/actions/teams';
import { haptic } from '@/lib/haptics';

interface Player {
    id: string;
    name: string;
    image?: string | null;
}

interface Guest {
    id: string;
    name: string;
}

interface Team {
    id: string;
    name: string | null;
    player1: Player | null;
    player2: Player | null;
    guest1: Guest | null;
    guest2: Guest | null;
}

interface Props {
    tournamentId: string;
    teams: Team[];
    availablePlayers: Player[];
    availableGuests: Guest[];
    isHost: boolean;
}

export default function TeamAssignment({
    tournamentId,
    teams,
    availablePlayers,
    availableGuests,
    isHost
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [selectedMember, setSelectedMember] = useState<{
        type: 'player' | 'guest';
        id: string;
        name: string;
    } | null>(null);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Get all assigned member IDs
    const assignedPlayerIds = new Set(
        teams.flatMap(t => [t.player1?.id, t.player2?.id].filter(Boolean))
    );
    const assignedGuestIds = new Set(
        teams.flatMap(t => [t.guest1?.id, t.guest2?.id].filter(Boolean))
    );

    // Unassigned members
    const unassignedPlayers = availablePlayers.filter(p => !assignedPlayerIds.has(p.id));
    const unassignedGuests = availableGuests.filter(g => !assignedGuestIds.has(g.id));

    const handleAutoAssign = () => {
        haptic.medium();
        startTransition(async () => {
            const result = await autoAssignTeams(tournamentId);
            if (result.success) {
                haptic.success();
            } else {
                haptic.error();
                alert(result.error);
            }
        });
    };

    const handleAddTeam = () => {
        haptic.light();
        startTransition(async () => {
            await createTeam(tournamentId);
        });
    };

    const handleDeleteTeam = (teamId: string) => {
        haptic.light();
        startTransition(async () => {
            await deleteTeam(teamId);
        });
    };

    const handleSlotClick = (teamId: string, slot: 'player1' | 'player2' | 'guest1' | 'guest2', currentMember: Player | Guest | null) => {
        if (!isHost) return;

        if (selectedMember) {
            // Assign selected member to this slot
            haptic.light();
            const slotType = selectedMember.type === 'player'
                ? (slot === 'player1' || slot === 'guest1' ? 'player1' : 'player2')
                : (slot === 'player1' || slot === 'guest1' ? 'guest1' : 'guest2');

            startTransition(async () => {
                const result = await assignToTeam(teamId, slotType, selectedMember.id);
                if (result.success) {
                    haptic.success();
                    setSelectedMember(null);
                } else {
                    haptic.error();
                    alert(result.error);
                }
            });
        } else if (currentMember) {
            // Clear this slot
            haptic.light();
            startTransition(async () => {
                await assignToTeam(teamId, slot, null);
            });
        }
    };

    const handleMemberClick = (type: 'player' | 'guest', id: string, name: string) => {
        if (!isHost) return;
        haptic.light();

        if (selectedMember?.id === id) {
            setSelectedMember(null);
        } else {
            setSelectedMember({ type, id, name });
        }
    };

    const handleSaveTeamName = (teamId: string) => {
        haptic.light();
        startTransition(async () => {
            await updateTeamName(teamId, editingName);
            setEditingTeamId(null);
        });
    };

    const getTeamDisplayName = (team: Team) => {
        if (team.name) return team.name;
        const m1 = team.player1?.name || team.guest1?.name;
        const m2 = team.player2?.name || team.guest2?.name;
        if (m1 && m2) return `${m1} & ${m2}`;
        if (m1) return m1;
        if (m2) return m2;
        return 'Leeres Team';
    };

    return (
        <div style={{ marginTop: 'var(--spacing-6)' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-4)'
            }}>
                <h3 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    color: 'var(--color-secondary)'
                }}>
                    <Users size={20} /> Teams zusammenstellen
                </h3>

                {isHost && (
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <button
                            onClick={handleAutoAssign}
                            disabled={isPending}
                            className="btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                padding: 'var(--spacing-2) var(--spacing-3)',
                                fontSize: '0.85rem',
                                border: '1px solid var(--color-secondary)',
                                color: 'var(--color-secondary)'
                            }}
                        >
                            <Shuffle size={16} /> Auto
                        </button>
                        <button
                            onClick={handleAddTeam}
                            disabled={isPending}
                            className="btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                padding: 'var(--spacing-2) var(--spacing-3)',
                                fontSize: '0.85rem',
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            <UserPlus size={16} /> Team
                        </button>
                    </div>
                )}
            </div>

            {/* Teams Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 'var(--spacing-4)'
            }}>
                {teams.map((team, index) => (
                    <div
                        key={team.id}
                        className="glass-panel"
                        style={{
                            padding: 'var(--spacing-4)',
                            position: 'relative'
                        }}
                    >
                        {/* Team Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--spacing-3)'
                        }}>
                            {editingTeamId === team.id ? (
                                <div style={{ display: 'flex', gap: 'var(--spacing-1)', flex: 1 }}>
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        placeholder={`Team ${index + 1}`}
                                        autoFocus
                                        style={{
                                            flex: 1,
                                            padding: 'var(--spacing-1) var(--spacing-2)',
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-secondary)',
                                            borderRadius: 'var(--radius-sm)',
                                            color: 'var(--color-text)',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                    <button
                                        onClick={() => handleSaveTeamName(team.id)}
                                        style={{
                                            background: 'var(--color-secondary)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: 'var(--spacing-1)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Check size={16} />
                                    </button>
                                </div>
                            ) : (
                                <span
                                    style={{
                                        fontWeight: 'bold',
                                        color: 'var(--color-text)',
                                        cursor: isHost ? 'pointer' : 'default'
                                    }}
                                    onClick={() => {
                                        if (isHost) {
                                            setEditingTeamId(team.id);
                                            setEditingName(team.name || '');
                                        }
                                    }}
                                >
                                    {getTeamDisplayName(team)}
                                </span>
                            )}

                            {isHost && editingTeamId !== team.id && (
                                <button
                                    onClick={() => handleDeleteTeam(team.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-text-dim)',
                                        cursor: 'pointer',
                                        padding: 'var(--spacing-1)'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Team Slots */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                            {/* Slot 1 (player1 or guest1) */}
                            <TeamSlot
                                member={team.player1 || team.guest1}
                                isGuest={!!team.guest1 && !team.player1}
                                isEmpty={!team.player1 && !team.guest1}
                                isSelected={selectedMember !== null}
                                isHost={isHost}
                                onClick={() => handleSlotClick(
                                    team.id,
                                    team.player1 ? 'player1' : 'guest1',
                                    team.player1 || team.guest1
                                )}
                            />

                            {/* Slot 2 (player2 or guest2) */}
                            <TeamSlot
                                member={team.player2 || team.guest2}
                                isGuest={!!team.guest2 && !team.player2}
                                isEmpty={!team.player2 && !team.guest2}
                                isSelected={selectedMember !== null}
                                isHost={isHost}
                                onClick={() => handleSlotClick(
                                    team.id,
                                    team.player2 ? 'player2' : 'guest2',
                                    team.player2 || team.guest2
                                )}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Unassigned Members */}
            {(unassignedPlayers.length > 0 || unassignedGuests.length > 0) && (
                <div style={{
                    marginTop: 'var(--spacing-6)',
                    padding: 'var(--spacing-4)',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--color-border)'
                }}>
                    <h4 style={{
                        fontSize: '0.9rem',
                        color: 'var(--color-text-dim)',
                        marginBottom: 'var(--spacing-3)'
                    }}>
                        Wartend ({unassignedPlayers.length + unassignedGuests.length})
                    </h4>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                        {unassignedPlayers.map(player => (
                            <button
                                key={player.id}
                                onClick={() => handleMemberClick('player', player.id, player.name)}
                                disabled={!isHost}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)',
                                    padding: 'var(--spacing-2) var(--spacing-3)',
                                    background: selectedMember?.id === player.id
                                        ? 'rgba(78, 205, 196, 0.3)'
                                        : 'var(--color-surface)',
                                    border: selectedMember?.id === player.id
                                        ? '2px solid var(--color-secondary)'
                                        : '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-text)',
                                    cursor: isHost ? 'pointer' : 'default',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {player.image ? (
                                    <img
                                        src={player.image}
                                        alt=""
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: 'var(--color-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        color: 'white'
                                    }}>
                                        {player.name[0]}
                                    </div>
                                )}
                                {player.name}
                            </button>
                        ))}

                        {unassignedGuests.map(guest => (
                            <button
                                key={guest.id}
                                onClick={() => handleMemberClick('guest', guest.id, guest.name)}
                                disabled={!isHost}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)',
                                    padding: 'var(--spacing-2) var(--spacing-3)',
                                    background: selectedMember?.id === guest.id
                                        ? 'rgba(155, 89, 182, 0.3)'
                                        : 'var(--color-surface)',
                                    border: selectedMember?.id === guest.id
                                        ? '2px solid #9b59b6'
                                        : '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-text)',
                                    cursor: isHost ? 'pointer' : 'default',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <span style={{ fontSize: '0.8rem' }}>👤</span>
                                {guest.name}
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: '#9b59b6',
                                    marginLeft: 'var(--spacing-1)'
                                }}>
                                    Gast
                                </span>
                            </button>
                        ))}
                    </div>

                    {selectedMember && (
                        <p style={{
                            marginTop: 'var(--spacing-3)',
                            fontSize: '0.85rem',
                            color: 'var(--color-secondary)'
                        }}>
                            Klicke auf einen leeren Team-Slot um {selectedMember.name} zuzuweisen
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function TeamSlot({
    member,
    isGuest,
    isEmpty,
    isSelected,
    isHost,
    onClick
}: {
    member: { name: string; image?: string | null } | null;
    isGuest: boolean;
    isEmpty: boolean;
    isSelected: boolean;
    isHost: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={!isHost}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                padding: 'var(--spacing-2) var(--spacing-3)',
                background: isEmpty && isSelected
                    ? 'rgba(78, 205, 196, 0.1)'
                    : 'var(--color-surface)',
                border: isEmpty && isSelected
                    ? '2px dashed var(--color-secondary)'
                    : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: isEmpty ? 'var(--color-text-dim)' : 'var(--color-text)',
                cursor: isHost ? 'pointer' : 'default',
                fontSize: '0.9rem',
                textAlign: 'left',
                width: '100%'
            }}
        >
            {isEmpty ? (
                <>
                    <span style={{ opacity: 0.5 }}>+</span>
                    <span style={{ fontStyle: 'italic' }}>Leer</span>
                </>
            ) : (
                <>
                    {!isGuest && (member as Player)?.image ? (
                        <img
                            src={(member as Player).image!}
                            alt=""
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: isGuest ? '#9b59b6' : 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            color: 'white'
                        }}>
                            {member?.name[0]}
                        </div>
                    )}
                    <span>{member?.name}</span>
                    {isGuest && (
                        <span style={{
                            fontSize: '0.7rem',
                            color: '#9b59b6',
                            marginLeft: 'auto'
                        }}>
                            Gast
                        </span>
                    )}
                </>
            )}
        </button>
    );
}
