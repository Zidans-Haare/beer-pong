import { TournamentStanding } from '@prisma/client';
import TournamentTable from '@/components/TournamentTable';
import { Trophy, Target, Shield, BarChart3 } from 'lucide-react';

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
    // Calculate statistics from matches if standings are empty
    let effectiveStandings = standings;

    if (standings.length === 0 && matches.length > 0) {
        // Build standings from matches
        const playerStats = new Map<string, any>();

        matches.filter(m => m.isPlayed).forEach(match => {
            if (!match.player1Id || !match.player2Id) return;

            // Initialize players if not exists
            if (!playerStats.has(match.player1Id)) {
                playerStats.set(match.player1Id, {
                    playerId: match.player1Id,
                    player: match.player1,
                    points: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0,
                    played: 0
                });
            }
            if (!playerStats.has(match.player2Id)) {
                playerStats.set(match.player2Id, {
                    playerId: match.player2Id,
                    player: match.player2,
                    points: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0,
                    played: 0
                });
            }

            const p1Stats = playerStats.get(match.player1Id)!;
            const p2Stats = playerStats.get(match.player2Id)!;

            p1Stats.played++;
            p2Stats.played++;
            p1Stats.goalsFor += match.score1 || 0;
            p1Stats.goalsAgainst += match.score2 || 0;
            p2Stats.goalsFor += match.score2 || 0;
            p2Stats.goalsAgainst += match.score1 || 0;

            if (match.winnerId === match.player1Id) {
                p1Stats.won++;
                p1Stats.points += 3;
                p2Stats.lost++;
            } else if (match.winnerId === match.player2Id) {
                p2Stats.won++;
                p2Stats.points += 3;
                p1Stats.lost++;
            } else {
                p1Stats.drawn++;
                p2Stats.drawn++;
                p1Stats.points += 1;
                p2Stats.points += 1;
            }

            p1Stats.goalDifference = p1Stats.goalsFor - p1Stats.goalsAgainst;
            p2Stats.goalDifference = p2Stats.goalsFor - p2Stats.goalsAgainst;
        });

        effectiveStandings = Array.from(playerStats.values()).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
    }

    // Calculate statistics
    const totalMatches = matches.filter(m => m.isPlayed).length;
    const totalGoals = matches.reduce((sum, m) => sum + (m.score1 || 0) + (m.score2 || 0), 0);

    // Find winner (highest points in standings)
    const winner = effectiveStandings.length > 0 ? effectiveStandings[0] : null;
    const topThree = effectiveStandings.slice(0, 3);

    // Best scorer (most goals for)
    const bestScorer = effectiveStandings.length > 0
        ? effectiveStandings.reduce((best, current) => current.goalsFor > best.goalsFor ? current : best)
        : null;

    // Best defense (least goals against)
    const bestDefense = effectiveStandings.length > 0
        ? effectiveStandings.reduce((best, current) => current.goalsAgainst < best.goalsAgainst ? current : best)
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
                    <h2 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <Trophy size={32} color="#FFD700" /> Sieger: {winner.player?.name || 'TBD'}
                    </h2>
                    <div style={{ fontSize: '1.2rem', color: 'var(--color-text-dim)' }}>
                        {winner.points} Punkte • {winner.won} Siege • {winner.goalsFor}:{winner.goalsAgainst} Becher
                    </div>
                </div>
            )}

            {/* Podium */}
            {effectiveStandings.length >= 3 && (
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
                        <div style={{ fontSize: '2.5rem', color: 'silver' }}>2.</div>
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
                        <div><Trophy size={48} color="#FFD700" /></div>
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
                        <div style={{ fontSize: '2.5rem', color: '#CD7F32' }}>3.</div>
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
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>Becher insgesamt</div>
                </div>

                {bestScorer && (
                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Target size={20} /> {bestScorer.player?.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            Bester Angreifer ({bestScorer.goalsFor} Becher)
                        </div>
                    </div>
                )}

                {bestDefense && (
                    <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Shield size={20} /> {bestDefense.player?.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            Beste Verteidigung ({bestDefense.goalsAgainst} Gegenbecher)
                        </div>
                    </div>
                )}
            </div>

            {/* Final Standings */}
            {effectiveStandings.length > 0 && (
                <div style={{ marginTop: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BarChart3 size={24} /> Endstand
                    </h2>
                    <TournamentTable standings={effectiveStandings.map(s => ({
                        playerId: s.playerId,
                        playerName: s.player?.name || 'Unbekannt',
                        matchesPlayed: s.played || 0,
                        wins: s.won || 0,
                        losses: s.lost || 0,
                        points: s.points || 0,
                        cupDiff: s.goalDifference || 0
                    }))} />
                </div>
            )}
        </div>
    );
}
