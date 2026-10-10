import { getPlayers } from '@/app/actions/players';
import InviteButton from '@/components/InviteButton';
import Link from 'next/link';
import { User, Trophy, TrendingUp, Sparkles, UserPlus } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { getTranslations } from 'next-intl/server';
import PageHeader from '@/components/PageHeader';
import { auth } from '@/auth';
import { Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
    const players = (await getPlayers()).filter(p => !p.isGuest);
    const t = await getTranslations('players');
    const session = await auth();
    const userId = session?.user?.id;
    const me = userId ? players.find((p: any) => p.userId === userId) : undefined;
    const others = me ? players.filter((p: any) => p.id !== me.id) : players;

    return (
        <div className="container page-content" style={{ paddingBottom: '100px' }}>
            <PageHeader title={t('title')} actions={<InviteButton />} />

            {me && (
                <section className="my-profile" aria-label={t('myProfile')}>
                    <span className="my-profile-label">{t('myProfile')}</span>
                    <Avatar src={me.image ? `${me.image}?v=3` : null} name={me.name} size={96} style={{ boxShadow: 'none' }} />
                    <h2 className="my-profile-name">{me.name}</h2>
                    {me.nickname && <span className="my-profile-nick">&quot;{me.nickname}&quot;</span>}
                    {me.motto && <p className="my-profile-motto">&quot;{me.motto}&quot;</p>}
                    <div className="my-profile-actions">
                        <Link href={`/players/${me.id}`} className="btn btn-primary">{t('openProfile')}</Link>
                        <Link href="/settings" className="btn btn-secondary"><Settings size={16} aria-hidden="true" /> {t('accountSettings')}</Link>
                    </div>
                </section>
            )}

            {me && others.length > 0 && <h2 className="section-title" style={{ fontSize: '1rem', margin: '0 0 12px' }}>{t('allPlayers')}</h2>}

            <div className="player-directory">
                {others.length === 0 && !me ? (
                    <div className="glass-panel" style={{ gridColumn: '1/-1', padding: 'var(--spacing-12)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                        <div style={{ marginBottom: 'var(--spacing-4)' }}><User size={48} style={{ opacity: 0.2 }} /></div>
                        {t('noPlayers')}
                    </div>
                ) : (
                    others.map((player: any) => (
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
        "#006b50",
        "#28647a",
        "#c34232",
        "#08754b",
    ];
    const bgGradient = gradients[player.name.length % gradients.length];

    return (
        <Link href={`/players/${player.id}`} className="glass-panel player-card" style={{
            padding: '0',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            overflow: 'hidden'
        }}>
            {/* Header / Avatar Area */}
            <div style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '16px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)'
            }}>
                <div>
                    <Avatar
                        src={player.image ? `${player.image}?v=3` : null}
                        name={player.name}
                        size={56}
                        style={{ boxShadow: "none" }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}><h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{player.name}</h3>
                {player.nickname && (
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)', marginTop: '4px' }}>&quot;{player.nickname}&quot;</span>
                )}
                </div>
            </div>

            {/* Stats / Motto */}
            <div style={{ padding: '12px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {player.motto ? (
                    <div style={{ display: 'flex', gap: '8px', color: 'var(--color-text-dim)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: 'var(--spacing-2)' }}>
                        <Sparkles size={16} style={{ minWidth: '16px', color: 'var(--color-secondary)' }} />
                        &quot;{player.motto}&quot;
                    </div>
                ) : (
                    null
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
