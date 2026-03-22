/**
 * DRY RUN: Round Robin + Playoffs (ranked)
 * 8 players, everyone vs everyone, then top 4 → Semis → Final + 3rd place
 *
 * Run: DATABASE_URL="file:/root/beer-pong/dev.db" npx tsx scripts/dry-run.ts
 */

import { prisma } from '../src/lib/prisma';
import { generateRoundRobinMatches } from '../src/lib/brackets';

async function generatePlayoffs(tournamentId: string) {
    // Recalculate standings from match results
    await (prisma as any).tournamentStanding.updateMany({
        where: { tournamentId },
        data: { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 }
    });
    const matches = await prisma.match.findMany({ where: { tournamentId, isPlayed: true } });
    for (const m of matches) {
        if (!m.player1Id || !m.player2Id || m.score1 == null || m.score2 == null) continue;
        const s1 = m.score1, s2 = m.score2;
        const p1 = m.player1Id, p2 = m.player2Id;
        if (s1 > s2) {
            await (prisma as any).tournamentStanding.updateMany({ where: { tournamentId, playerId: p1 }, data: { played: { increment: 1 }, won: { increment: 1 }, points: { increment: 3 }, goalsFor: { increment: s1 }, goalsAgainst: { increment: s2 }, goalDifference: { increment: s1 - s2 } } });
            await (prisma as any).tournamentStanding.updateMany({ where: { tournamentId, playerId: p2 }, data: { played: { increment: 1 }, lost: { increment: 1 }, goalsFor: { increment: s2 }, goalsAgainst: { increment: s1 }, goalDifference: { increment: s2 - s1 } } });
        } else if (s2 > s1) {
            await (prisma as any).tournamentStanding.updateMany({ where: { tournamentId, playerId: p2 }, data: { played: { increment: 1 }, won: { increment: 1 }, points: { increment: 3 }, goalsFor: { increment: s2 }, goalsAgainst: { increment: s1 }, goalDifference: { increment: s2 - s1 } } });
            await (prisma as any).tournamentStanding.updateMany({ where: { tournamentId, playerId: p1 }, data: { played: { increment: 1 }, lost: { increment: 1 }, goalsFor: { increment: s1 }, goalsAgainst: { increment: s2 }, goalDifference: { increment: s1 - s2 } } });
        }
    }
    // Seed top 4 into bracket
    const standings = await (prisma as any).tournamentStanding.findMany({
        where: { tournamentId },
        orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }]
    });
    const top4 = standings.slice(0, 4);
    if (top4.length < 4) throw new Error('Not enough players for playoffs');
    // 1v4, 3v2
    const semi1 = await prisma.match.create({ data: { tournamentId, player1Id: top4[0].playerId, player2Id: top4[3].playerId, round: 1, position: 0, stage: 'BRACKET', isPlayed: false } });
    const semi2 = await prisma.match.create({ data: { tournamentId, player1Id: top4[2].playerId, player2Id: top4[1].playerId, round: 1, position: 1, stage: 'BRACKET', isPlayed: false } });
    await prisma.match.create({ data: { tournamentId, player1Id: null, player2Id: null, round: 2, position: 0, stage: 'BRACKET', isPlayed: false } });
    await prisma.match.create({ data: { tournamentId, player1Id: null, player2Id: null, round: 2, position: 1, stage: 'BRACKET', isPlayed: false } });
    return { semi1Id: semi1.id, semi2Id: semi2.id };
}

function simulateScore(): [number, number] {
    const score1 = Math.floor(Math.random() * 6) + 5; // 5-10
    let score2 = Math.floor(Math.random() * 6) + 3;   // 3-8
    if (score1 === score2) score2 = score1 - 1;        // no draws
    return [score1, score2];
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 DRY RUN: Round Robin + Playoffs (ranked) — 8 players');
    console.log('='.repeat(70) + '\n');

    // 1. Fetch or create 8 players
    const players = await prisma.player.findMany({ take: 8 });

    if (players.length < 8) {
        console.log(`⚠️  Only ${players.length} players found — creating test players...\n`);
        for (let i = players.length + 1; i <= 8; i++) {
            const player = await prisma.player.create({
                data: { name: `Test Player ${i}`, nickname: `Tester${i}`, isGuest: true }
            });
            players.push(player);
        }
    }

    console.log('👥 PLAYERS:');
    players.forEach((p, i) => console.log(`   ${i + 1}. ${p.name} (${p.nickname || 'no nickname'})`));
    console.log();

    // 2. Create tournament
    const tournament = await prisma.tournament.create({
        data: {
            name: 'DRY RUN Round Robin',
            date: new Date(),
            location: 'Test Location',
            type: 'ROUND_ROBIN',
            status: 'PLANNED',
            hasReturnLeg: false,
            tableCount: 2,
            matchDurationMin: 15,
            mode: 'SOLO',
            isRanked: true,
            shortCode: 'DRYRRB'
        }
    });

    console.log(`🏆 TOURNAMENT CREATED: ${tournament.name} (ID: ${tournament.id})`);
    console.log(`   Ranked: ✅  Tables: 2  Mode: Round Robin + Playoffs\n`);

    // 3. Add RSVPs
    for (const player of players) {
        await prisma.rSVP.create({
            data: { tournamentId: tournament.id, playerId: player.id, status: 'YES' }
        });
    }

    // 4. Generate round robin matches + standings records
    const matchInputs = generateRoundRobinMatches(tournament.id, players.map(p => p.id), false);
    for (const input of matchInputs) {
        await prisma.match.create({
            data: {
                tournamentId: input.tournamentId,
                round: input.round,
                position: input.position,
                stage: input.stage,
                player1Id: input.player1Id,
                player2Id: input.player2Id,
                isPlayed: false
            }
        });
    }
    // Create standings rows (required by generateKnockoutFromGroups)
    for (const p of players) {
        await prisma.tournamentStanding.upsert({
            where: { tournamentId_playerId: { tournamentId: tournament.id, playerId: p.id } },
            update: {},
            create: { tournamentId: tournament.id, playerId: p.id, groupId: 0 }
        });
    }

    await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'IN_PROGRESS' }
    });

    const leagueMatches = await prisma.match.findMany({
        where: { tournamentId: tournament.id },
        include: { player1: true, player2: true },
        orderBy: [{ round: 'asc' }, { position: 'asc' }]
    });

    console.log(`📊 ${leagueMatches.length} league matches generated\n`);

    // 5. Simulate all league matches
    console.log('🎮 LEAGUE PHASE:');
    console.log('-'.repeat(70));

    for (const match of leagueMatches) {
        if (!match.player1Id || !match.player2Id) continue;
        const [score1, score2] = simulateScore();
        const winnerId = score1 > score2 ? match.player1Id : match.player2Id;
        await prisma.match.update({
            where: { id: match.id },
            data: { score1, score2, winnerId, isPlayed: true }
        });
        console.log(`   R${match.round}: ${match.player1?.name} ${score1}:${score2} ${match.player2?.name}`);
    }

    // 6. Generate playoffs (recalculates standings, seeds top 4 into bracket)
    console.log('\n⚔️  GENERATING PLAYOFFS (top 4)...');
    await generatePlayoffs(tournament.id);

    // 7. Show standings
    const standingsRows = await prisma.tournamentStanding.findMany({
        where: { tournamentId: tournament.id },
        include: { player: true },
        orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }]
    });

    console.log('\n📈 LEAGUE STANDINGS:');
    console.log('   Pl | Player               | W  | L  | Cups   | Diff | Pts');
    console.log('   ' + '-'.repeat(58));
    standingsRows.forEach((s, i) => {
        const name = (s.player?.name ?? '?').padEnd(21);
        const cups = `${s.goalsFor}:${s.goalsAgainst}`.padStart(6);
        const diff = (s.goalDifference >= 0 ? '+' : '') + s.goalDifference;
        console.log(`   ${(i + 1).toString().padStart(2)} | ${name} | ${s.won.toString().padStart(2)} | ${s.lost.toString().padStart(2)} | ${cups} | ${diff.padStart(4)} | ${s.points}`);
    });

    // 8. Simulate bracket
    const bracketMatches = await prisma.match.findMany({
        where: { tournamentId: tournament.id, stage: 'BRACKET' },
        include: { player1: true, player2: true },
        orderBy: [{ round: 'asc' }, { position: 'asc' }]
    });

    const semis = bracketMatches.filter(m => m.round === 1);
    const finals = bracketMatches.filter(m => m.round === 2);

    console.log('\n⚔️  PLAYOFFS:');
    console.log('-'.repeat(70));

    const semiWinners: string[] = [];
    const semiLosers: string[] = [];

    for (const match of semis) {
        if (!match.player1Id || !match.player2Id) continue;
        const [s1, s2] = simulateScore();
        const winnerId = s1 > s2 ? match.player1Id : match.player2Id;
        const loserId = s1 > s2 ? match.player2Id : match.player1Id;
        await prisma.match.update({ where: { id: match.id }, data: { score1: s1, score2: s2, winnerId, isPlayed: true } });
        semiWinners.push(winnerId);
        semiLosers.push(loserId);
        const w = s1 > s2 ? match.player1?.name : match.player2?.name;
        console.log(`   SF: ${match.player1?.name} ${s1}:${s2} ${match.player2?.name}  → ${w} advances`);
    }

    // Fill final + 3rd place player IDs
    const finalMatch = finals.find(m => m.position === 0);
    const thirdMatch = finals.find(m => m.position === 1);

    if (finalMatch && semiWinners.length === 2) {
        await prisma.match.update({ where: { id: finalMatch.id }, data: { player1Id: semiWinners[0], player2Id: semiWinners[1] } });
    }
    if (thirdMatch && semiLosers.length === 2) {
        await prisma.match.update({ where: { id: thirdMatch.id }, data: { player1Id: semiLosers[0], player2Id: semiLosers[1] } });
    }

    // Simulate final
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    let champion = '?', runnerUp = '?', third = '?', fourth = '?';

    if (finalMatch && semiWinners.length === 2) {
        const [fs1, fs2] = simulateScore();
        const champId = fs1 > fs2 ? semiWinners[0] : semiWinners[1];
        const ruId = fs1 > fs2 ? semiWinners[1] : semiWinners[0];
        await prisma.match.update({ where: { id: finalMatch.id }, data: { score1: fs1, score2: fs2, winnerId: champId, isPlayed: true } });
        champion = playerMap.get(champId) ?? '?';
        runnerUp = playerMap.get(ruId) ?? '?';
        console.log(`   🏆 FINAL: ${playerMap.get(semiWinners[0])} ${fs1}:${fs2} ${playerMap.get(semiWinners[1])}`);
    }

    if (thirdMatch && semiLosers.length === 2) {
        const [ts1, ts2] = simulateScore();
        const thirdId = ts1 > ts2 ? semiLosers[0] : semiLosers[1];
        const fourthId = ts1 > ts2 ? semiLosers[1] : semiLosers[0];
        await prisma.match.update({ where: { id: thirdMatch.id }, data: { score1: ts1, score2: ts2, winnerId: thirdId, isPlayed: true } });
        third = playerMap.get(thirdId) ?? '?';
        fourth = playerMap.get(fourthId) ?? '?';
        console.log(`   🥉 3RD PLACE: ${playerMap.get(semiLosers[0])} ${ts1}:${ts2} ${playerMap.get(semiLosers[1])}`);
    }

    // 9. Complete tournament
    await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'COMPLETED' }
    });

    console.log('\n' + '='.repeat(70));
    console.log('🎊 FINAL RESULTS:');
    console.log('='.repeat(70));
    console.log(`   🥇 1st: ${champion}`);
    console.log(`   🥈 2nd: ${runnerUp}`);
    console.log(`   🥉 3rd: ${third}`);
    console.log(`      4th: ${fourth}`);
    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Tournament viewable at: http://localhost:3000/tournaments/${tournament.id}\n`);
    console.log('🧹 To clean up:');
    console.log(`   DATABASE_URL="file:/root/beer-pong/dev.db" npx tsx -e "import('./src/lib/prisma').then(({prisma})=>prisma.\\$transaction([prisma.match.deleteMany({where:{tournamentId:'${tournament.id}'}}),prisma.rSVP.deleteMany({where:{tournamentId:'${tournament.id}'}}),prisma.tournamentStanding.deleteMany({where:{tournamentId:'${tournament.id}'}}),prisma.tournament.delete({where:{id:'${tournament.id}'}})]).then(()=>console.log('Done!')).finally(()=>process.exit(0)))"\n`);
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
