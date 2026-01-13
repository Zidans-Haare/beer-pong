import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login', // Custom login page
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            // Explicitly allow uploads
            if (nextUrl.pathname.startsWith('/uploads')) {
                return true;
            }

            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard'); // Example protected route
            const isOnLogin = nextUrl.pathname.startsWith('/login');
            const isOnRegister = nextUrl.pathname.startsWith('/register');

            // Protect /tournaments/new and editing pages
            if (nextUrl.pathname.startsWith('/tournaments/new') || nextUrl.pathname.startsWith('/admin')) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            }

            // Allow general access to everything else for now
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;