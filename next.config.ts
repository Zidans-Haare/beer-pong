import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
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
  org: "test-gnd",
  project: "javascript-nextjs",
  silent: !process.env.CI,

  // Sentry Webpack-Plugin deaktivieren — spart RAM beim Build auf dem Server.
  // Das Runtime-SDK läuft weiter via instrumentation-client.ts / instrumentation.ts.
  webpack: {
    disableSentryConfig: true,
  },

  tunnelRoute: "/monitoring",
});
