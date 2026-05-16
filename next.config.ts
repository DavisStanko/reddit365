import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/reddit/:path*',
        destination: 'https://www.reddit.com/:path*',
      },
    ]
  }
};

export default nextConfig;
