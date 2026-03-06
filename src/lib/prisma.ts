import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    (() => {
        // Use DATABASE_URL env var (strip "file:" prefix if present)
        const dbPath = (process.env.DATABASE_URL || 'file:/home/htw/beer-pong/prisma/dev.db')
            .replace(/^file:/, '');
        const adapter = new PrismaBetterSqlite3({ url: dbPath });
        return new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
        });
    })();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
