import { prisma } from '../src/lib/prisma';

async function fixStandings() {
    const tournamentId = '1f38f8ca-0673-40c2-a607-36587cedf9a4';

    // Get all matches
    const matches = await prisma.match.findMany({
        where: { tournamentId, isPlayed: true },
        include: { player1: true, player2: true }
    });

    console.log('Matches found:', matches.length);

    // Build standings from matches
    const stats = new Map<string, any>();

    matches.forEach(m => {
        if (m.player1Id && m.player2Id && m.stage.includes('GROUP')) {
            // Init players if not exist
            // Convert stage to groupId number
            const groupNum = m.stage === 'GROUP_1' ? 1 : m.stage === 'GROUP_2' ? 2 : 0;

            if (!stats.has(m.player1Id)) {
                stats.set(m.player1Id, {
                    playerId: m.player1Id,
                    name: m.player1?.name,
                    groupId: groupNum,
                    played: 0, won: 0, drawn: 0, lost: 0,
                    goalsFor: 0, goalsAgainst: 0, points: 0
                });
            }
            if (!stats.has(m.player2Id)) {
                stats.set(m.player2Id, {
                    playerId: m.player2Id,
                    name: m.player2?.name,
                    groupId: groupNum,
                    played: 0, won: 0, drawn: 0, lost: 0,
                    goalsFor: 0, goalsAgainst: 0, points: 0
                });
            }

            const s1 = stats.get(m.player1Id)!;
            const s2 = stats.get(m.player2Id)!;

            s1.played++; s2.played++;
            s1.goalsFor += m.score1 || 0; s1.goalsAgainst += m.score2 || 0;
            s2.goalsFor += m.score2 || 0; s2.goalsAgainst += m.score1 || 0;

            if ((m.score1 || 0) > (m.score2 || 0)) {
                s1.won++; s1.points += 3;
                s2.lost++;
            } else if ((m.score2 || 0) > (m.score1 || 0)) {
                s2.won++; s2.points += 3;
                s1.lost++;
            } else {
                s1.drawn++; s1.points += 1;
                s2.drawn++; s2.points += 1;
            }
        }
    });

    console.log('Stats calculated for', stats.size, 'players');

    // Delete old standings
    await prisma.tournamentStanding.deleteMany({ where: { tournamentId } });
    console.log('Old standings deleted');

    // Create new standings
    for (const [playerId, s] of stats) {
        await prisma.tournamentStanding.create({
            data: {
                tournamentId,
                playerId,
                groupId: s.groupId,
                played: s.played,
                won: s.won,
                drawn: s.drawn,
                lost: s.lost,
                goalsFor: s.goalsFor,
                goalsAgainst: s.goalsAgainst,
                goalDifference: s.goalsFor - s.goalsAgainst,
                points: s.points
            }
        });
        console.log(`Created: ${s.groupId} - ${s.name} - ${s.points} Pkt`);
    }

    console.log('\nDone! Created', stats.size, 'standings');
}

fixStandings()
    .catch(console.error)
    .finally(() => process.exit(0));
