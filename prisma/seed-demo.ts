/**
 * Demo Seed Script
 * Resets the database to a clean demo state.
 * Only run on demo instances — never on production.
 *
 * Usage: npx tsx prisma/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), process.env.DEMO_DB ?? 'demo.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

const DEMO_USER_EMAIL = 'demo@beer-pong.app';
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'demo-password-change-me';

async function main() {
    console.log('🍺 Seeding demo database...');

    // 1. Clear all data
    await prisma.chatMessage.deleteMany();
    await prisma.tickerEvent.deleteMany();
    await prisma.match.deleteMany();
    await prisma.tournamentParticipant.deleteMany();
    await prisma.tournamentStanding.deleteMany();
    await prisma.rSVP.deleteMany();
    await prisma.tournament.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.player.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create Demo User (no admin)
    const hashedPassword = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    const demoUser = await prisma.user.create({
        data: {
            name: 'Demo User',
            email: DEMO_USER_EMAIL,
            password: hashedPassword,
            status: 'ACTIVE',
        },
    });
    console.log('✓ Demo user created:', DEMO_USER_EMAIL);

    // 3. Create Players
    const playersData = [
        { name: 'Alex',    nickname: 'The Sniper',     motto: 'One throw, one cup.',        email: DEMO_USER_EMAIL, userId: demoUser.id },
        { name: 'Jordan',  nickname: 'Lucky J',        motto: 'Luck is just skill in disguise.' },
        { name: 'Sam',     nickname: 'The Wall',       motto: 'Nobody gets past me.' },
        { name: 'Taylor',  nickname: 'Bouncer',        motto: 'Trickshots only.' },
        { name: 'Morgan',  nickname: 'Ice Queen',      motto: 'Cold as the hops.' },
        { name: 'Casey',   nickname: 'Party Animal',   motto: 'The after-game is the game.' },
        { name: 'Riley',   nickname: 'Lucky Luke',     motto: 'Faster than his shadow.' },
        { name: 'Quinn',   nickname: 'The Pro',        motto: 'Professional drinking.' },
        { name: 'Drew',    nickname: 'Clutch King',    motto: 'I only play in finals.' },
        { name: 'Avery',   nickname: 'The Architect',  motto: 'Every cup is calculated.' },
    ];

    const players = await Promise.all(
        playersData.map(data => prisma.player.create({ data }))
    );
    console.log(`✓ ${players.length} players created.`);

    // 4. Completed Tournament — Summer Cup
    const summerCup = await prisma.tournament.create({
        data: {
            name: 'Summer Cup 2025',
            date: new Date('2025-07-20T18:00:00Z'),
            location: 'Rooftop Bar',
            status: 'COMPLETED',
            type: 'ROUND_ROBIN',
            hasReturnLeg: false,
            isRanked: true,
        },
    });

    const summerPlayers = players.slice(0, 6);
    for (const p of summerPlayers) {
        await prisma.tournamentParticipant.create({
            data: { tournamentId: summerCup.id, playerId: p.id },
        });
        await prisma.rSVP.create({
            data: { tournamentId: summerCup.id, playerId: p.id, status: 'YES' },
        });
    }

    // 6 players → 5 rounds × 3 matches (proper round-robin schedule)
    // R1: 0v1, 2v3, 4v5  |  R2: 0v2, 1v4, 3v5  |  R3: 0v3, 1v5, 2v4
    // R4: 0v4, 1v3, 2v5  |  R5: 0v5, 1v2, 3v4
    const summerMatches = [
        { p1: 0, p2: 1, s1: 10, s2: 7,  w: 0, dur: 420, r: 1 },
        { p1: 2, p2: 3, s1: 10, s2: 6,  w: 2, dur: 420, r: 1 },
        { p1: 4, p2: 5, s1: 10, s2: 9,  w: 4, dur: 570, r: 1 },
        { p1: 0, p2: 2, s1: 8,  s2: 10, w: 2, dur: 510, r: 2 },
        { p1: 1, p2: 4, s1: 9,  s2: 10, w: 4, dur: 540, r: 2 },
        { p1: 3, p2: 5, s1: 7,  s2: 10, w: 5, dur: 420, r: 2 },
        { p1: 0, p2: 3, s1: 10, s2: 5,  w: 0, dur: 360, r: 3 },
        { p1: 1, p2: 5, s1: 10, s2: 8,  w: 1, dur: 450, r: 3 },
        { p1: 2, p2: 4, s1: 10, s2: 7,  w: 2, dur: 480, r: 3 },
        { p1: 0, p2: 4, s1: 10, s2: 9,  w: 0, dur: 600, r: 4 },
        { p1: 1, p2: 3, s1: 10, s2: 4,  w: 1, dur: 300, r: 4 },
        { p1: 2, p2: 5, s1: 5,  s2: 10, w: 5, dur: 510, r: 4 },
        { p1: 0, p2: 5, s1: 7,  s2: 10, w: 5, dur: 480, r: 5 },
        { p1: 1, p2: 2, s1: 6,  s2: 10, w: 2, dur: 390, r: 5 },
        { p1: 3, p2: 4, s1: 10, s2: 8,  w: 3, dur: 390, r: 5 },
    ];

    for (let i = 0; i < summerMatches.length; i++) {
        const m = summerMatches[i];
        await prisma.match.create({
            data: {
                tournamentId: summerCup.id,
                player1Id: summerPlayers[m.p1].id,
                player2Id: summerPlayers[m.p2].id,
                score1: m.s1,
                score2: m.s2,
                winnerId: summerPlayers[m.w].id,
                isPlayed: true,
                round: m.r,
                position: i,
                stage: 'LEAGUE',
                durationSeconds: m.dur,
            },
        });
    }
    console.log('✓ Completed tournament: Summer Cup 2025');

    // 5. Completed Tournament — New Year's Cup
    const newYearsCup = await prisma.tournament.create({
        data: {
            name: "New Year's Cup 2025",
            date: new Date('2025-12-31T20:00:00Z'),
            location: "Jordan's Place",
            status: 'COMPLETED',
            type: 'ELIMINATION',
            isRanked: true,
        },
    });

    const nyPlayers = [players[1], players[3], players[5], players[7]];
    for (const p of nyPlayers) {
        await prisma.tournamentParticipant.create({
            data: { tournamentId: newYearsCup.id, playerId: p.id },
        });
        await prisma.rSVP.create({
            data: { tournamentId: newYearsCup.id, playerId: p.id, status: 'YES' },
        });
    }

    // Semi-finals
    await prisma.match.create({
        data: {
            tournamentId: newYearsCup.id,
            player1Id: nyPlayers[0].id,
            player2Id: nyPlayers[1].id,
            score1: 10, score2: 7,
            winnerId: nyPlayers[0].id,
            isPlayed: true, round: 1, position: 0,
            stage: 'BRACKET', durationSeconds: 420,
        },
    });
    await prisma.match.create({
        data: {
            tournamentId: newYearsCup.id,
            player1Id: nyPlayers[2].id,
            player2Id: nyPlayers[3].id,
            score1: 6, score2: 10,
            winnerId: nyPlayers[3].id,
            isPlayed: true, round: 1, position: 1,
            stage: 'BRACKET', durationSeconds: 510,
        },
    });
    // Final
    await prisma.match.create({
        data: {
            tournamentId: newYearsCup.id,
            player1Id: nyPlayers[0].id,
            player2Id: nyPlayers[3].id,
            score1: 10, score2: 8,
            winnerId: nyPlayers[0].id,
            isPlayed: true, round: 2, position: 0,
            stage: 'BRACKET', durationSeconds: 540,
        },
    });
    console.log("✓ Completed tournament: New Year's Cup 2025");

    // 6. Active Tournament — Spring League
    const springLeague = await prisma.tournament.create({
        data: {
            name: 'Spring League 2026',
            date: new Date(),
            location: 'The Garage',
            status: 'ACTIVE',
            type: 'ROUND_ROBIN',
            hasReturnLeg: false,
            isRanked: true,
        },
    });

    const springPlayers = players.slice(0, 8);
    for (const p of springPlayers) {
        await prisma.tournamentParticipant.create({
            data: { tournamentId: springLeague.id, playerId: p.id },
        });
        await prisma.rSVP.create({
            data: { tournamentId: springLeague.id, playerId: p.id, status: 'YES' },
        });
    }

    // Full Round Robin: all 28 unique pairs, flat (round=1, sequential positions)
    // 12 played, 16 pending
    const springMatches = [
        { p1: 0, p2: 1, s1: 10, s2: 6,  w: 0,  played: true,  dur: 390 },
        { p1: 2, p2: 3, s1: 7,  s2: 10, w: 3,  played: true,  dur: 450 },
        { p1: 4, p2: 5, s1: 10, s2: 9,  w: 4,  played: true,  dur: 540 },
        { p1: 6, p2: 7, s1: 8,  s2: 10, w: 7,  played: true,  dur: 420 },
        { p1: 0, p2: 2, s1: 10, s2: 7,  w: 0,  played: true,  dur: 480 },
        { p1: 1, p2: 3, s1: 5,  s2: 10, w: 3,  played: true,  dur: 360 },
        { p1: 4, p2: 6, s1: 10, s2: 8,  w: 4,  played: true,  dur: 510 },
        { p1: 5, p2: 7, s1: 9,  s2: 10, w: 7,  played: true,  dur: 570 },
        { p1: 0, p2: 3, s1: 6,  s2: 10, w: 3,  played: true,  dur: 420 },
        { p1: 1, p2: 2, s1: 10, s2: 8,  w: 1,  played: true,  dur: 390 },
        { p1: 4, p2: 7, s1: 10, s2: 6,  w: 4,  played: true,  dur: 450 },
        { p1: 5, p2: 6, s1: 10, s2: 7,  w: 5,  played: true,  dur: 480 },
        { p1: 0, p2: 4, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 1, p2: 5, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 2, p2: 6, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 3, p2: 7, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 0, p2: 5, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 1, p2: 4, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 2, p2: 7, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 3, p2: 6, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 0, p2: 6, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 1, p2: 7, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 2, p2: 4, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 3, p2: 5, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 0, p2: 7, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 1, p2: 6, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 2, p2: 5, s1: 0, s2: 0, w: -1, played: false, dur: null },
        { p1: 3, p2: 4, s1: 0, s2: 0, w: -1, played: false, dur: null },
    ];

    for (let i = 0; i < springMatches.length; i++) {
        const m = springMatches[i];
        await prisma.match.create({
            data: {
                tournamentId: springLeague.id,
                player1Id: springPlayers[m.p1].id,
                player2Id: springPlayers[m.p2].id,
                score1: m.s1,
                score2: m.s2,
                winnerId: m.w >= 0 ? springPlayers[m.w].id : null,
                isPlayed: m.played,
                round: 1,
                position: i,
                stage: 'LEAGUE',
                durationSeconds: m.dur ?? undefined,
            },
        });
    }

    await prisma.tickerEvent.createMany({
        data: [
            { tournamentId: springLeague.id, type: 'MATCH_START', content: 'Spring League 2026 is live! First match: Alex vs Jordan.' },
            { tournamentId: springLeague.id, type: 'SCORE_UPDATE', content: 'Alex leads 6:3 against Jordan' },
            { tournamentId: springLeague.id, type: 'MATCH_END', content: 'Alex wins 10:6 — strong opener!' },
            { tournamentId: springLeague.id, type: 'MATCH_START', content: 'Sam vs Taylor — underdog match!' },
            { tournamentId: springLeague.id, type: 'MATCH_END', content: 'Taylor wins 10:7 — surprise result!' },
        ],
    });
    console.log('✓ Active tournament: Spring League 2026');

    // 7. Planned Tournament
    const summerClash = await prisma.tournament.create({
        data: {
            name: 'Summer Clash 2026',
            date: new Date('2026-07-04T17:00:00Z'),
            location: 'Rooftop Bar',
            status: 'PLANNED',
            type: 'ELIMINATION',
            isRanked: true,
        },
    });

    const clashRsvps = [
        { playerId: players[0].id, status: 'YES' },
        { playerId: players[1].id, status: 'YES' },
        { playerId: players[2].id, status: 'YES' },
        { playerId: players[4].id, status: 'YES' },
        { playerId: players[6].id, status: 'YES' },
        { playerId: players[3].id, status: 'MAYBE' },
        { playerId: players[5].id, status: 'MAYBE' },
        { playerId: players[7].id, status: 'NO' },
    ];
    for (const rsvp of clashRsvps) {
        await prisma.rSVP.create({ data: { tournamentId: summerClash.id, ...rsvp } });
    }
    console.log('✓ Planned tournament: Summer Clash 2026');

    // 8. Simulated Chat Messages
    await prisma.chatMessage.createMany({
        data: [
            { userId: demoUser.id, text: 'Welcome to the Beer Pong demo! 🍺', createdAt: new Date(Date.now() - 3600_000 * 5) },
            { userId: demoUser.id, text: 'Check out the Spring League — it\'s still running!', createdAt: new Date(Date.now() - 3600_000 * 3) },
            { userId: demoUser.id, text: 'Taylor just beat Sam 10:7 — nobody saw that coming 😂', createdAt: new Date(Date.now() - 3600_000 * 1) },
            { userId: demoUser.id, text: 'Who\'s ready for the Summer Clash in July? 🔥', createdAt: new Date(Date.now() - 1800_000) },
            { userId: demoUser.id, text: 'This is a read-only demo — deploy your own instance to create an account!', createdAt: new Date(Date.now() - 600_000) },
        ],
    });
    console.log('✓ Chat messages seeded.');

    console.log('\n🍺 Demo seeding complete!');
    console.log(`   Demo login: ${DEMO_USER_EMAIL}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
