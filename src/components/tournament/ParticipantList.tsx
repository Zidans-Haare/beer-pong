'use client';

import { Users, User } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    image?: string | null;
}

interface Guest {
    id: string;
    name: string;
}

interface Props {
    players: Player[];
    guests: Guest[];
    isTeamMode: boolean;
}

export default function ParticipantList({ players, guests, isTeamMode }: Props) {
    const totalCount = players.length + guests.length;

    return (
        <section className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
            <h3 style={{
                marginBottom: 'var(--spacing-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                fontSize: '1rem',
                fontWeight: 600
            }}>
                {isTeamMode ? <Users size={18} /> : <User size={18} />}
                {isTeamMode ? 'Verfügbare Spieler' : 'Teilnehmer'}
                <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'var(--color-text-dim)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '2px 8px',
                    borderRadius: '99px'
                }}>
                    {totalCount}
                </span>
            </h3>

            {totalCount === 0 ? (
                <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: 'var(--spacing-4)' }}>
                    Noch keine Teilnehmer. Teile den Link!
                </p>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 'var(--spacing-2)'
                }}>
                    {players.map((player) => (
                        <ParticipantCard
                            key={player.id}
                            name={player.name}
                            image={player.image}
                            isGuest={false}
                        />
                    ))}

                    {guests.map((guest) => (
                        <ParticipantCard
                            key={guest.id}
                            name={guest.name}
                            isGuest={true}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function ParticipantCard({ name, image, isGuest }: { name: string; image?: string | null; isGuest: boolean }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            padding: 'var(--spacing-2) var(--spacing-3)',
            background: isGuest ? 'rgba(155, 89, 182, 0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isGuest ? 'rgba(155, 89, 182, 0.3)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem'
        }}>
            {image && !isGuest ? (
                <img
                    src={image}
                    alt=""
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--color-border)'
                    }}
                />
            ) : (
                <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isGuest ? '#9b59b6' : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'white'
                }}>
                    {name[0].toUpperCase()}
                </div>
            )}
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {name}
            </span>
            {isGuest && (
                <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: '#9b59b6',
                    marginLeft: 'auto'
                }}>
                    GAST
                </span>
            )}
        </div>
    );
}
