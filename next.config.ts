import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Cache Components (Next.js 16). Required for 'use cache' and
  // 'use cache: remote' directives to function. Without this flag, all
  // use cache directives are silently ignored and no caching occurs.
  cacheComponents: true,
};

export default nextConfig;
