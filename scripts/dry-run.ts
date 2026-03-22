/**
 * DRY RUN: Round Robin Tournament Simulation
 * 8 players, everyone vs everyone, ranked, 2 tables
 *
 * Run: DATABASE_URL="file:/root/beer-pong/dev.db" npx tsx scripts/dry-run.ts
 */

import { prisma } from '../src/lib/prisma';
import { generateRoundRobinMatches } from '../src/lib/brackets';

function simulateScore(): [number, number] {
    const score1 = Math.floor(Math.random() * 6) + 5; // 5-10
    let score2 = Math.floor(Math.random() * 6) + 3;   // 3-8
    if (score1 === score2) score2 = score1 - 1;        // no draws
    return [score1, score2];
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 DRY RUN: Round Robin (ranked) with 8 players');
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
    console.log(`   Ranked: ✅  Tables: 2  Mode: Round Robin\n`);

    // 3. Add RSVPs
    for (const player of players) {
        await prisma.rSVP.create({
            data: { tournamentId: tournament.id, playerId: player.id, status: 'YES' }
        });
    }
    console.log('✅ 8 players added to lobby\n');

    // 4. Generate round robin matches
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

    await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'IN_PROGRESS' }
    });

    const matches = await prisma.match.findMany({
        where: { tournamentId: tournament.id },
        include: { player1: true, player2: true },
        orderBy: [{ round: 'asc' }, { position: 'asc' }]
    });

    console.log(`📊 ${matches.length} matches generated (${Math.ceil(matches.length / 4)} rounds)\n`);

    // 5. Simulate all matches
    console.log('🎮 MATCH SIMULATION:');
    console.log('-'.repeat(70));

    const standings = new Map<string, {
        name: string; played: number; won: number; lost: number;
        cupsFor: number; cupsAgainst: number;
    }>();

    for (const p of players) {
        standings.set(p.id, { name: p.name, played: 0, won: 0, lost: 0, cupsFor: 0, cupsAgainst: 0 });
    }

    for (const match of matches) {
        if (!match.player1Id || !match.player2Id) continue;

        const [score1, score2] = simulateScore();
        const winnerId = score1 > score2 ? match.player1Id : match.player2Id;

        await prisma.match.update({
            where: { id: match.id },
            data: { score1, score2, winnerId, isPlayed: true }
        });

        const s1 = standings.get(match.player1Id)!;
        const s2 = standings.get(match.player2Id)!;
        s1.played++; s2.played++;
        s1.cupsFor += score1; s1.cupsAgainst += score2;
        s2.cupsFor += score2; s2.cupsAgainst += score1;
        if (score1 > score2) { s1.won++; s2.lost++; }
        else { s2.won++; s1.lost++; }

        console.log(`   R${match.round}: ${match.player1?.name} ${score1}:${score2} ${match.player2?.name}`);
    }

    // 6. Final standings
    const sorted = Array.from(standings.entries())
        .map(([id, s]) => ({ id, ...s, diff: s.cupsFor - s.cupsAgainst }))
        .sort((a, b) => b.won - a.won || b.diff - a.diff || b.cupsFor - a.cupsFor);

    console.log('\n' + '='.repeat(70));
    console.log('🏁 FINAL STANDINGS:');
    console.log('='.repeat(70));
    console.log('   Pl | Player               | W  | L  | Cups   | Diff');
    console.log('   ' + '-'.repeat(55));
    sorted.forEach((s, i) => {
        const name = s.name.padEnd(21);
        const cups = `${s.cupsFor}:${s.cupsAgainst}`.padStart(6);
        const diff = (s.diff >= 0 ? '+' : '') + s.diff;
        console.log(`   ${(i + 1).toString().padStart(2)} | ${name} | ${s.won.toString().padStart(2)} | ${s.lost.toString().padStart(2)} | ${cups} | ${diff}`);
    });

    // 7. Mark completed
    await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'COMPLETED' }
    });

    console.log('\n' + '='.repeat(70));
    console.log(`🥇 WINNER: ${sorted[0].name}  (${sorted[0].won}W / ${sorted[0].lost}L)`);
    console.log('='.repeat(70));
    console.log(`\n✅ Tournament viewable at: http://localhost:3000/tournaments/${tournament.id}\n`);

    console.log('🧹 To clean up run:');
    console.log(`   DATABASE_URL="file:/root/beer-pong/dev.db" npx tsx -e "import { prisma } from './src/lib/prisma'; await prisma.match.deleteMany({where:{tournamentId:'${tournament.id}'}}); await prisma.rSVP.deleteMany({where:{tournamentId:'${tournament.id}'}}); await prisma.tournament.delete({where:{id:'${tournament.id}'}}); console.log('Done!'); process.exit(0);"\n`);
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
