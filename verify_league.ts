
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { TournamentService } from './src/lib/services/TournamentService';
import { MatchService } from './src/lib/services/MatchService';

async function main() {
    console.log("--- Starting Verification (Round Robin + Return Leg) ---");

    const dbPath = path.join(process.cwd(), 'dev.db');
    console.log("Database path:", dbPath);

    const adapter = new PrismaBetterSqlite3({
        url: dbPath
    });

    const prisma = new PrismaClient({ adapter });

    try {
        // 1. Create Dummy Players
        console.log("Creating players...");
        const p1 = await prisma.player.create({ data: { name: "League Bot 1" } });
        const p2 = await prisma.player.create({ data: { name: "League Bot 2" } });

        // 2. Create Tournament (Round Robin with Return Leg)
        console.log("Creating tournament...");
        const tournament = await prisma.tournament.create({
            data: {
                name: "League Verification",
                date: new Date(),
                location: "Console",
                type: "ROUND_ROBIN",
                status: "PLANNED",
                hasReturnLeg: true, // Enable Return Leg
            }
        });

        await prisma.tournamentParticipant.createMany({
            data: [
                { tournamentId: tournament.id, playerId: p1.id },
                { tournamentId: tournament.id, playerId: p2.id },
            ]
        });

        console.log("Starting tournament...");
        await TournamentService.startTournament(tournament.id);

        const startedT = await prisma.tournament.findUnique({
            where: { id: tournament.id },
            include: { matches: true }
        });

        if (startedT?.status !== 'ACTIVE') throw new Error("Tournament not active");
        // Expect 2 matches (1 vs 2, and 2 vs 1)
        if (startedT.matches.length !== 2) throw new Error("Expected 2 matches for Return Leg, got " + startedT.matches.length);
        console.log("Tournament started. Matches created:", startedT.matches.length);

        // Verify Rounds
        const m1 = startedT.matches.find(m => m.round === 1);
        const m2 = startedT.matches.find(m => m.round === 2);
        if (!m1 || !m2) throw new Error("Missing rounds");

        console.log(`Match 1: ${m1.player1Id} vs ${m1.player2Id}`);
        console.log(`Match 2: ${m2.player1Id} vs ${m2.player2Id}`);

        if (m1.player1Id === m2.player1Id) console.warn("WARNING: Players not swapped for return leg? (Check logic)");

        // 3. Play Match 1
        console.log("Playing Match 1...");
        await MatchService.updateMatch(m1.id, 10, 5);

        // Check status - should NOT be completed
        const tAfterM1 = await prisma.tournament.findUnique({ where: { id: tournament.id } });
        if (tAfterM1?.status === 'COMPLETED') throw new Error("Tournament finished too early!");

        // 4. Play Match 2
        console.log("Playing Match 2...");
        await MatchService.updateMatch(m2.id, 8, 10);

        // Check status - SHOULD be completed
        const finishedT = await prisma.tournament.findUnique({ where: { id: tournament.id } });
        if (finishedT?.status !== 'COMPLETED') throw new Error("Tournament not completed after last match!");

        console.log("SUCCESS: League with Return Leg logic verified.");

    } catch (e) {
        console.error("VERIFICATION FAILED:", e);
        throw e;
    }
}

main();
