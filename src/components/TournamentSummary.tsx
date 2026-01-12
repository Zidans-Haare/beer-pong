import { TournamentStanding } from '@prisma/client';
import TournamentTable from '@/components/TournamentTable';

interface TournamentSummaryProps {
    tournamentId: string;
    tournamentName: string;
    tournamentType: string;
    standings: any[];
    matches: any[];
}

export default function TournamentSummary({
    tournamentId,
    tournamentName,
    tournamentType,
    standings,
    matches
}: TournamentSummaryProps) {
    // Calculate statistics
    const totalMatches = matches.filter(m => m.isPlayed).length;
    const totalGoals = matches.reduce((sum, m) => sum + (m.score1 || 0) + (m.score2 || 0), 0);

    // Find winner (highest points in standings)
    const winner = standings.length > 0 ? standings.sort((a, b) => b.points - a.points)[0] : null;
    const topThree = standings.slice(0, 3);

    // Best scorer (most goals for)
    const bestScorer = standings.length > 0
        ? standings.reduce((best, current) => current.goalsFor > best.goalsFor ? current : best)
        : null;

    // Best defense (least goals against)
    const bestDefense = standings.length > 0
        ? standings.reduce((best, current) => current.goalsAgainst < best.goalsAgainst ? current : best)
        : null;

    return (
        <div style={{ marginTop: 'var(--spacing-12)' }}>
            {/* Winner Announcement */}
            {winner && (
                <div className="glass-panel" style={{
                    padding: 'var(--spacing-8)',
                    marginBottom: 'var(--spacing-8)',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,140,0,0.1))',
                    border: '2px solid gold'
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-4)' }}>
                        🏆 Sieger: {winner.player?.name || 'TBD'}
                    </h2>
                    <div style={{ fontSize: '1.2rem', color: 'var(--color-text-dim)' }}>
                        {winner.points} Punkte • {winner.won} Siege • {winner.goalsFor}:{winner.goalsAgainst} Tore
                    </div>
                </div>
            )}

            {/* Podium */}
            {topThree.length >= 3 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    gap: 'var(--spacing-4)',
                    marginBottom: 'var(--spacing-8)',
                    flexWrap: 'wrap'
                }}>
                    {/* 2nd Place */}
                    <div className="glass-panel" style={{
                        padding: 'var(--spacing-6)',
                        textAlign: 'center',
                        minWidth: '150px',
                        background: 'rgba(192,192,192,0.1)',
                        border: '1px solid silver'
                    }}>
                        <div style={{ fontSize: '3rem' }}>🥈</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: 'var(--spacing-2)' }}>
                            {topThree[1]?.player?.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            {topThree[1]?.points} Punkte
                        </div>
                    </div>

                    {/* 1st Place */}
                    <div className="glass-panel" style={{
                        padding: 'var(--spacing-6)',
                        textAlign: 'center',
                        minWidth: '150px',
                        background: 'rgba(255,215,0,0.1)',
                        border: '2px solid gold',
                        transform: 'scale(1.1)'
                    }}>
                        <div style={{ fontSize: '4rem' }}>🥇</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: 'var(--spacing-2)' }}>
                            {topThree[0]?.player?.name}
                        </div>
                        <div style={{ fontSize: '1rem', color: 'var(--color-text-dim)' }}>
                            {topThree[0]?.points} Punkte
                        </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="glass-panel" style={{
                        padding: 'var(--spacing-6)',
                        textAlign: 'center',
                        minWidth: '150px',
                        background: 'rgba(205,127,50,0.1)',
                        border: '1px solid #CD7F32'
                    }}>
                        <div style={{ fontSize: '3rem' }}>🥉</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: 'var(--spacing-2)' }}>
                            {topThree[2]?.player?.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            {topThree[2]?.points} Punkte
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-4)',
                marginBottom: 'var(--spacing-8)'
            }}>
                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        {totalMatches}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>Spiele gespielt</div>
                </div>

                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        {totalGoals}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>Tore insgesamt</div>
                </div>

                {bestScorer && (
                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                            ⚽ {bestScorer.player?.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            Bester Angreifer ({bestScorer.goalsFor} Tore)
                        </div>
                    </div>
                )}

                {bestDefense && (
                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                            🛡️ {bestDefense.player?.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            Beste Verteidigung ({bestDefense.goalsAgainst} Gegentore)
                        </div>
                    </div>
                )}
            </div>

            {/* Final Standings */}
            <div style={{ marginTop: 'var(--spacing-8)' }}>
                <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>
                    📊 Endstand
                </h2>
                <TournamentTable standings={standings} />
            </div>
        </div>
    );
}
