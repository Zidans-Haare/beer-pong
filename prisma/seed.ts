import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding database...');

    const adminEmail = process.env.ADMIN_EMAIL || 'nick.olomek@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'secret';

    // 1. Clear existing data
    await prisma.tickerEvent.deleteMany();
    await prisma.match.deleteMany();
    await prisma.tournamentParticipant.deleteMany();
    await prisma.tournamentStanding.deleteMany();
    await prisma.rSVP.deleteMany();
    await prisma.tournament.deleteMany();
    await prisma.player.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create Admin User
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
        data: {
            name: 'Nick',
            email: adminEmail,
            password: hashedPassword,
        }
    });
    console.log('Created Admin User:', adminEmail);

    // 3. Create Players
    const playersData = [
        { name: 'Nick', nickname: 'The King', motto: 'Bier her oder ich fall um!', userId: adminUser.id, email: adminEmail },
        { name: 'Lukas', nickname: 'Sniper', motto: 'Ein Wurf, ein Treffer.' },
        { name: 'Marco', nickname: 'The Wall', motto: 'Keiner kommt vorbei.' },
        { name: 'Sarah', nickname: 'Bouncer', motto: 'Trickshots only.' },
        { name: 'Julia', nickname: 'Ice Queen', motto: 'Kalt wie der Hopfen.' },
        { name: 'Stefan', nickname: 'Party Animal', motto: 'Nach dem Spiel ist vor dem Spiel.' },
        { name: 'Felix', nickname: 'Lucky Luke', motto: 'Schneller als sein Schatten.' },
        { name: 'Elena', nickname: 'The Pro', motto: 'Professionelles Trinken.' },
    ];

    const players = await Promise.all(
        playersData.map(data => prisma.player.create({ data }))
    );

    console.log(`Created ${players.length} players.`);

    // 3. Create a COMPLETED Tournament
    const tournament1 = await prisma.tournament.create({
        data: {
            name: 'Silvester Cup 2025',
            date: new Date('2025-12-31T20:00:00Z'),
            location: 'Nicks Keller',
            status: 'COMPLETED',
            type: 'ROUND_ROBIN',
            hasReturnLeg: false,
        }
    });

    // Add 4 participants
    for (let i = 0; i < 4; i++) {
        await prisma.tournamentParticipant.create({
            data: { tournamentId: tournament1.id, playerId: players[i].id }
        });
    }

    // Create matches for Tournament 1
    // (P1 vs P2, P1 vs P3, P1 vs P4, P2 vs P3, P2 vs P4, P3 vs P4)
    const matches1 = [
        { p1: 0, p2: 1, s1: 10, s2: 8, w: 0 },
        { p1: 0, p2: 2, s1: 7, s2: 10, w: 2 },
        { p1: 0, p2: 3, s1: 10, s2: 9, w: 0 },
        { p1: 1, p2: 2, s1: 10, s2: 4, w: 1 },
        { p1: 1, p2: 3, s1: 5, s2: 10, w: 3 },
        { p1: 2, p2: 3, s1: 10, s2: 8, w: 2 },
    ];

    for (const m of matches1) {
        await prisma.match.create({
            data: {
                tournamentId: tournament1.id,
                player1Id: players[m.p1].id,
                player2Id: players[m.p2].id,
                score1: m.s1,
                score2: m.s2,
                winnerId: players[m.w].id,
                isPlayed: true,
                round: 1,
                position: 0,
            }
        });
    }

    console.log('Created completed tournament: Silvester Cup');

    // 4. Create an ACTIVE Tournament
    const tournament2 = await prisma.tournament.create({
        data: {
            name: 'Montags-Liga',
            date: new Date(),
            location: 'Sporthalle',
            status: 'ACTIVE',
            type: 'ELIMINATION',
        }
    });

    // Add all 8 participants
    for (const player of players) {
        await prisma.tournamentParticipant.create({
            data: { tournamentId: tournament2.id, playerId: player.id }
        });
        await prisma.rSVP.create({
            data: { tournamentId: tournament2.id, playerId: player.id, status: 'YES' }
        });
    }

    // Create some initial matches for Tournament 2 (Round 1)
    for (let i = 0; i < 4; i++) {
        const p1Idx = i * 2;
        const p2Idx = i * 2 + 1;
        const isPlayed = i === 0; // Only first match is played
        await prisma.match.create({
            data: {
                tournamentId: tournament2.id,
                player1Id: players[p1Idx].id,
                player2Id: players[p2Idx].id,
                score1: isPlayed ? 10 : 0,
                score2: isPlayed ? 6 : 0,
                winnerId: isPlayed ? players[p1Idx].id : null,
                isPlayed: isPlayed,
                round: 1,
                position: i,
            }
        });
    }

    // 5. Create Ticker Events
    await prisma.tickerEvent.createMany({
        data: [
            { tournamentId: tournament2.id, type: 'MATCH_START', content: 'Das erste Match der Montags-Liga hat begonnen!' },
            { tournamentId: tournament2.id, type: 'SCORE_UPDATE', content: 'Nick führt mit 5:2 gegen Lukas' },
            { tournamentId: tournament2.id, type: 'MATCH_END', content: 'Nick gewinnt das Auftaktmatch mit 10:6!' },
        ]
    });

    console.log('Created active tournament: Montags-Liga');
    console.log('Seeding finished successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        // Just let it exit
    });
