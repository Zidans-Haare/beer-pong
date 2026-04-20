import type { NextAuthConfig } from 'next-auth';

// Routes that are accessible without a logged-in account
const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/rules',
    '/join',
    '/offline',
    '/demo',
];

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request }) {
            const isLoggedIn = !!auth?.user;
            const path = request.nextUrl.pathname;

            // Always allow public paths and their sub-paths
            if (PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))) {
                return true;
            }

            // Allow static assets, uploads, and root-level public files (sw.js, manifest.json, etc.)
            if (path.startsWith('/uploads') || path.startsWith('/_next')) {
                return true;
            }
            if (/^\/(sw\.js|manifest\.json|favicon\.ico|robots\.txt|sitemap\.xml)$/.test(path)) {
                return true;
            }

            // Allow guests (with guest session cookie) to view tournament pages
            if (path.startsWith('/tournaments/')) {
                const guestCookie = request.cookies.get('bierpong_guest_session');
                if (guestCookie?.value) return true;
            }

            // Everything else requires login
            if (!isLoggedIn) return false;

            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig;