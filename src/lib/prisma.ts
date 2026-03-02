import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    (() => {
        // Determine database path relative to project root
        const dbPath = path.join(process.cwd(), 'dev.db');
        const adapter = new PrismaBetterSqlite3({
            url: dbPath
        });
        return new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
        });
    })();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
