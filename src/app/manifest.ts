import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Beer Pong';

    return {
        name: appName,
        short_name: appName,
        description: 'Professional Beer Pong Tournament Manager',
        start_url: '/',
        id: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f8f8fc',
        theme_color: '#f8f8fc',
        categories: ['games', 'sports', 'entertainment'],
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        shortcuts: [
            {
                name: 'New Tournament',
                short_name: 'New',
                description: 'Create a new tournament quickly',
                url: '/tournaments/new',
                icons: [{ src: '/icon.png', sizes: '96x96' }],
            },
            {
                name: 'Tournaments',
                short_name: 'Tournaments',
                description: 'View all tournaments',
                url: '/tournaments',
                icons: [{ src: '/icon.png', sizes: '96x96' }],
            },
            {
                name: 'Players',
                short_name: 'Players',
                description: 'View player list',
                url: '/players',
                icons: [{ src: '/icon.png', sizes: '96x96' }],
            },
        ],
        screenshots: [
            {
                src: '/screenshot-wide.png',
                sizes: '1280x720',
                type: 'image/png',
                form_factor: 'wide',
                label: 'Tournament Overview',
            },
            {
                src: '/screenshot-narrow.png',
                sizes: '750x1334',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Mobile View',
            },
        ],
        prefer_related_applications: false,
        launch_handler: {
            client_mode: 'navigate-existing',
        },
    };
}
