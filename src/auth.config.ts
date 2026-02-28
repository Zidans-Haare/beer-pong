import type { NextAuthConfig } from 'next-auth';

// Routes that are accessible without a logged-in account
const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/rules',
    '/join',
    '/offline',
];

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const path = nextUrl.pathname;

            // Always allow public paths and their sub-paths
            if (PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))) {
                return true;
            }

            // Allow static assets and uploads
            if (path.startsWith('/uploads') || path.startsWith('/_next')) {
                return true;
            }

            // Everything else requires login
            if (!isLoggedIn) return false;

            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig;