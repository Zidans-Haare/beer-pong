
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TournamentService } from '@/lib/services/TournamentService';
import { MatchService } from '@/lib/services/MatchService';
import { auth } from '@/auth';

export async function GET() {
    // Security: Only admins can run simulations
    const session = await auth();
    if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        console.log("🍻 Starting Tournament Simulation API...");

        // 1. Create 8 dummy players if missing
        const playerNames = ["Sim-Max", "Sim-Lisa", "Sim-Tom", "Sim-Sarah", "Sim-Ben", "Sim-Ewa", "Sim-Jan", "Sim-Zoe"];
        const players = [];

        for (const name of playerNames) {
            let player = await prisma.player.findFirst({ where: { name } });
            if (!player) {
                player = await prisma.player.create({
                    data: {
                        name,
                        email: `${name}@test.com`,
                        nickname: name
                        // userId: removed to avoid FK error
                    }
                });
            }
            players.push(player);
        }

        // 2. Create Tournament
        const tournament = await prisma.tournament.create({
            data: {
                name: `Simulation ${new Date().toLocaleTimeString()}`,
                date: new Date(),
                location: "Simulation Lab",
                type: "GROUPS", // 2 Groups of 4 -> Semis -> Final
                status: "PLANNED",
                matchDurationMin: 10,
                tableCount: 2,
                hostId: players[0].userId
            }
        });

        // 3. Join Players
        for (const p of players) {
            await prisma.rSVP.create({
                data: { tournamentId: tournament.id, playerId: p.id, status: "YES" }
            });
            await prisma.tournamentParticipant.create({
                data: { tournamentId: tournament.id, playerId: p.id }
            });
        }

        // 4. Start Tournament
        await TournamentService.startTournament(tournament.id);

        // 5. Simulate Group Phase
        let matches = await prisma.match.findMany({
            where: { tournamentId: tournament.id, isPlayed: false },
            orderBy: [{ round: 'asc' }, { position: 'asc' }]
        });

        while (matches.length > 0) {
            const match = matches[0];
            if (!match.player1Id || !match.player2Id) break; // Should not happen in Groups

            const score1 = Math.floor(Math.random() * 11);
            const score2 = Math.floor(Math.random() * 11);
            const s1 = score1 === score2 ? score1 + 1 : score1;
            const s2 = score2;

            await MatchService.updateMatch(match.id, s1, s2);

            matches = await prisma.match.findMany({
                where: { tournamentId: tournament.id, isPlayed: false },
                orderBy: [{ round: 'asc' }, { position: 'asc' }]
            });
        }

        // 6. Simulate Knockout
        let activeBracketMatches = await prisma.match.findMany({
            where: { tournamentId: tournament.id, stage: 'BRACKET', isPlayed: false, player1Id: { not: null }, player2Id: { not: null } }
        });

        let safety = 0;
        while (activeBracketMatches.length > 0 && safety < 20) {
            safety++;
            for (const m of activeBracketMatches) {
                const s1 = 10;
                const s2 = Math.floor(Math.random() * 9);
                await MatchService.updateMatch(m.id, s1, s2);
            }
            activeBracketMatches = await prisma.match.findMany({
                where: { tournamentId: tournament.id, stage: 'BRACKET', isPlayed: false, player1Id: { not: null }, player2Id: { not: null } }
            });
        }

        return NextResponse.json({
            success: true,
            message: "Simulation Completed!",
            tournamentId: tournament.id,
            link: `${process.env.APP_URL || 'http://localhost:3000'}/tournaments/${tournament.id}`
        });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
