import { getPlayers } from '@/app/actions/players';
import InviteButton from '@/components/InviteButton';
import Link from 'next/link';
import { User, Trophy, TrendingUp, Sparkles, UserPlus } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
    const players = await getPlayers();
    const t = await getTranslations('players');

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-8)' }}>
                <div>
                    <h1 className="title-display" style={{ fontSize: '2rem' }}>{t('title')}</h1>

                </div>
                <InviteButton />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-6)' }}>
                {players.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1/-1', padding: 'var(--spacing-12)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                        <div style={{ marginBottom: 'var(--spacing-4)' }}><User size={48} style={{ opacity: 0.2 }} /></div>
                        {t('noPlayers')}
                    </div>
                ) : (
                    players.map((player: any) => (
                        <PlayerCard key={player.id} player={player} />
                    ))
                )}
            </div>
        </div>
    );
}

function PlayerCard({ player }: { player: any }) {
    // Generate initials
    const initials = player.name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Random-ish gradient based on name length for variety (deterministic)
    const gradients = [
        'linear-gradient(135deg, #FF6B6B 0%, #d946ef 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    ];
    const bgGradient = gradients[player.name.length % gradients.length];

    return (
        <Link href={`/players/${player.id}`} className="glass-panel" style={{
            padding: '0',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            overflow: 'hidden'
        }}>
            {/* Header / Avatar Area */}
            <div style={{
                padding: 'var(--spacing-6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'var(--color-surface-hover)',
                borderBottom: '1px solid var(--color-border)'
            }}>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                    <Avatar
                        src={player.image ? `${player.image}?v=3` : null}
                        name={player.name}
                        size={80}
                        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                    />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', margin: 0, textAlign: 'center' }}>{player.name}</h3>
                {player.nickname && (
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)', marginTop: '4px' }}>&quot;{player.nickname}&quot;</span>
                )}
            </div>

            {/* Stats / Motto */}
            <div style={{ padding: 'var(--spacing-6)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {player.motto ? (
                    <div style={{ display: 'flex', gap: '8px', color: 'var(--color-text-dim)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: 'var(--spacing-2)' }}>
                        <Sparkles size={16} style={{ minWidth: '16px', color: 'var(--color-secondary)' }} />
                        &quot;{player.motto}&quot;
                    </div>
                ) : (
                    <div style={{ height: '24px' }}></div> // Spacer
                )}

                {/* Placeholder for stats - if we had them in this payload */}
                {/* 
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 'var(--spacing-4)', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                        <Trophy size={14} color="var(--color-warning)" />
                        <span>-- Wins</span>
                    </div>
                </div> 
                */}
            </div>
        </Link>
    );
}
