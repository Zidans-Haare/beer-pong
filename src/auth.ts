import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod'; // We might need zod, or handle validation manually. 
// Assuming we don't have zod installed yet, let's use manual validation or install zod.
// Package.json didn't show zod. Let's use basic validation or install it. 
// For now, manual.

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from "@auth/prisma-adapter"

async function getUser(email: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const email = credentials.email as string;
                const password = credentials.password as string;

                if (!email || !password) return null;

                const user = await getUser(email);
                if (!user || !user.password) return null;

                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (!passwordsMatch) return null;

                if (user.status !== 'ACTIVE') return null;

                return user;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token }) {
            return token;
        }
    }
});
