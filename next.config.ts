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
    ];
  },
};

export default nextConfig;
