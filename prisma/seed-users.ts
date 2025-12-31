
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import Database from 'better-sqlite3';

// Replicating initialization from src/lib/prisma.ts but with explicit Database import if needed
// Actually, src/lib/prisma.ts usage seems unique or maybe using a wrapper?
// Let's try to be robust. If src/lib/prisma.ts works, I'll try to follow it, 
// BUT standard docs say pass Database instance. 
// If `PrismaBetterSqlite3` constructor accepts { url }, fine. If not, I'll fallback to Database instance.
// Checking src/lib/prisma.ts again: line 12: new PrismaBetterSqlite3({ url: dbPath })
// I will try to use the same.

async function main() {
    console.log('Initializing Prisma with Adapter...');
    const dbPath = path.join(process.cwd(), 'dev.db');

    // Try to use the same logic as src/lib/prisma.ts
    // Note: If that fails, it means src/lib/prisma.ts might rely on a specific version behavior I'm missing context on.
    // But let's assume it works.

    // However, I suspect better-sqlite3 import is missing in src/lib/prisma.ts because it might be a type-only import there?
    // No, new PrismaBetterSqlite3 is called.

    // Let's try the standard way first because it is safer for a script:
    // const db = new Database(dbPath);
    // const adapter = new PrismaBetterSqlite3(db);

    // But wait, if I use the standard way, and the generated client expects something else?
    // No, generated client just needs an adapter passed to it.

    // I will TRY to match src/lib/prisma.ts EXACTLY first.

    let adapter;
    try {
        // @ts-ignore
        adapter = new PrismaBetterSqlite3({ url: dbPath });
    } catch (e) {
        console.log('Adapter init with url failed, trying with Database instance...', e);
        adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
    }

    const prisma = new PrismaClient({
        adapter,
    });

    console.log('Seeding 10 dummy users...');

    const dummyNames = [
        'Lukas Podolski', 'Thomas Müller', 'Manuel Neuer', 'Bastian Schweinsteiger',
        'Philipp Lahm', 'Miroslav Klose', 'Mesut Özil', 'Sami Khedira',
        'Toni Kroos', 'Mario Götze'
    ];

    for (const name of dummyNames) {
        const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
        const nickname = name.split(' ')[1];

        try {
            // 1. Create User
            // Check if exists first
            const existing = await prisma.user.findUnique({ where: { email } });
            let userId = existing?.id;

            if (!existing) {
                const user = await prisma.user.create({
                    data: {
                        name,
                        email,
                        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                    }
                });
                userId = user.id;
            }

            // 2. Create Player linked to User
            // Check if player exists
            const existingPlayer = await prisma.player.findFirst({ where: { userId } });
            if (!existingPlayer) {
                await prisma.player.create({
                    data: {
                        name,
                        nickname,
                        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                        userId: userId,
                        bio: 'Dummy player for testing',
                        motto: 'Das Runde muss ins Eckige!',
                    }
                });
                console.log(`Created user/player: ${name}`);
            } else {
                console.log(`Player ${name} already exists.`);
            }

        } catch (err) {
            console.error(`Error creating ${name}:`, err);
        }
    }

    console.log('Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        // Disconnect not strictly needed for script exit but good practice
        // adapter doesn't have disconnect?
        process.exit(0);
    });
