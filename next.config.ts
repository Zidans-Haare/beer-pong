import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: false },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com", // Next.js + Google Maps
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",               // Framer Motion + Google Fonts
      "img-src 'self' data: blob: https://maps.gstatic.com https://*.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://places.googleapis.com https://*.sentry.io",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/custom-uploads/:path*',
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry-Organisation und Projekt (für Source Maps Upload)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: true,

  // Source Maps hochladen und aus dem Client-Bundle entfernen
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },

  // Automatisches Instrumentation von Server Components und API Routes
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
});
