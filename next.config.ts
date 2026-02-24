import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // experimental: {
  //   serverActions: {
  //     bodySizeLimit: '10mb',
  //   },
  // },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/custom-uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
