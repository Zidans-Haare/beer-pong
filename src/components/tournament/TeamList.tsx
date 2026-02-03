'use client';

import { Users } from 'lucide-react';
import Avatar from '@/components/Avatar';

interface Team {
    id: string;
    name: string | null;
    player1: { name: string; image?: string | null } | null;
    player2: { name: string; image?: string | null } | null;
    guest1: { name: string } | null;
    guest2: { name: string } | null;
}

export default function TeamList({ teams }: { teams: Team[] }) {
    if (teams.length === 0) return null;

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
                <Users size={18} /> Teams
                <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'var(--color-text-dim)',
                    background: 'var(--color-surface-hover)',
                    padding: '2px 8px',
                    borderRadius: '99px'
                }}>
                    {teams.length}
                </span>
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 'var(--spacing-3)'
            }}>
                {teams.map((team, index) => {
                    const member1 = team.player1 || team.guest1;
                    const member2 = team.player2 || team.guest2;
                    const displayName = team.name || `Team ${index + 1}`;

                    if (!member1 && !member2) return null; // Skip empty teams

                    return (
                        <div key={team.id} style={{
                            padding: 'var(--spacing-3)',
                            background: 'var(--color-surface-hover)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-2)'
                        }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', borderBottom: '1px dashed var(--color-border)', paddingBottom: '4px', marginBottom: '4px' }}>
                                {displayName}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {member1 && <TeamMemberRow member={member1} isGuest={!!team.guest1 && !team.player1} />}
                                {member2 && <TeamMemberRow member={member2} isGuest={!!team.guest2 && !team.player2} />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function TeamMemberRow({ member, isGuest }: { member: { name: string; image?: string | null }, isGuest: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <Avatar
                src={(member as any).image}
                name={member.name}
                size={20}
                isGuest={isGuest}
            />
            <span style={{ color: isGuest ? '#9b59b6' : 'var(--color-text)' }}>
                {member.name} {isGuest && '(Gast)'}
            </span>
        </div>
    );
}
