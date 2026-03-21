'use client';

import { Users, User } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('participants');

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
                {isTeamMode ? t('available') : t('participants')}
                <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'var(--color-text-dim)',
                    background: 'var(--color-surface-hover)',
                    padding: '2px 8px',
                    borderRadius: '99px'
                }}>
                    {totalCount}
                </span>
            </h3>

            {totalCount === 0 ? (
                <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: 'var(--spacing-4)' }}>
                    {t('none')}
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
            background: isGuest ? 'rgba(155, 89, 182, 0.08)' : 'var(--color-surface-hover)',
            border: `1px solid ${isGuest ? 'rgba(155, 89, 182, 0.3)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem'
        }}>
            <Avatar
                src={isGuest ? null : image}
                name={name}
                size={28}
                isGuest={isGuest}
                style={{ border: '2px solid var(--color-border)' }}
            />
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
