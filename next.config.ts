import type { NextConfig } from "next";

// NOTE: Do NOT add cacheComponents: true here. That flag enables PPR globally
// across the entire app, which breaks Server Components not designed for it.
// The API proxy uses unstable_cache for persistent shared caching instead.
const nextConfig: NextConfig = {};

export default nextConfig;
