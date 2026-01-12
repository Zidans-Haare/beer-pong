const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'dev.db');
const db = new Database(dbPath);
const adapter = new PrismaBetterSqlite3(db);
const prisma = new PrismaClient({ adapter });

async function main() {
  const players = await prisma.player.findMany({
    where: { image: { not: null } },
    take: 5,
    select: { name: true, image: true }
  });
  console.log(JSON.stringify(players, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());