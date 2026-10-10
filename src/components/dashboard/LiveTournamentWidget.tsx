import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Trophy } from 'lucide-react';
import { getTeamDisplayName } from '@/lib/team-utils';

async function getActiveTournament() {
    const tournament = await prisma.tournament.findFirst({
        where: { status: 'ACTIVE' },
        include: {
            matches: {
                where: { isPlayed: false },
                include: { player1: true, player2: true, team1: { include: { player1: true, player2: true, guest1: true, guest2: true } }, team2: { include: { player1: true, player2: true, guest1: true, guest2: true } } },
                take: 4, // Show max 4 pending matches
            }
        },
        orderBy: { date: 'desc' }
    });
    return tournament;
}

export default async function LiveTournamentWidget() {
    const activeTournament = await getActiveTournament();
    const t = await getTranslations('home');

    if (!activeTournament) {
        return (
            <section className="live-tournament">
                <div className="widget-header">
                    <span className="widget-title">{t('liveTournament')}</span>
                </div>
                <div style={{ padding: 'var(--spacing-8) 0', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                    <Trophy size={32} style={{ marginBottom: '12px' }} /><p style={{ marginBottom: 'var(--spacing-4)' }}>{t('noActiveTournament')}</p>
                    <Link href="/tournaments" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                        {t('startTournament')}
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="live-tournament">
            {/* Background Glow */}

            <div className="widget-header">
                <span className="widget-title">{t('liveTournament')}</span>
                <div className="live-badge">
                    <div className="live-dot" /> LIVE
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                <h2 className="live-tournament-name">
                    {activeTournament.name}
                </h2>

                {activeTournament.matches.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                        {t('matchesPreparing')}
                    </div>
                ) : (
                    <div className="live-match-list">
                        {activeTournament.matches.map((match) => (
                            <div key={match.id} className="live-match-row">
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                    {match.team1 ? getTeamDisplayName(match.team1) : match.player1?.name || 'TBD'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>VS</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                    {match.team2 ? getTeamDisplayName(match.team2) : match.player2?.name || 'TBD'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', justifyContent: 'center' }}>
                    <Link href={`/tournaments/${activeTournament.id}`} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }}>
                        {t('goToTournament')}<ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
