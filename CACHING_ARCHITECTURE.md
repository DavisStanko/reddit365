# Reddit365 Caching Architecture & Post-Mortem

This document serves as a comprehensive guide to the caching architecture in Reddit365, documenting the reasons behind the current implementation and detailing previous failed attempts. **Do not attempt to rewrite the caching logic without reading this document first.**

## The Problem

Reddit365 relies on Reddit's unauthenticated RSS feeds (`.rss`) to bypass CORS and API blocks for `.json` endpoints. Reddit aggressively rate-limits these RSS feeds (returning HTTP 429). To provide a responsive "Outlook-like" experience where users can quickly switch between feeds and view posts, the application **must** cache these feeds aggressively.

The requirements for caching are:
1. **Server-Side Only**: Feeds must be fetched and cached by the Next.js API proxy (`app/api/reddit/route.ts`).
2. **Persistent across invocations**: Because Vercel uses a serverless architecture, memory is isolated per lambda container and destroyed after inactivity. In-memory caches alone expire too quickly, resulting in frequent cache misses and rate limits when switching feeds.
3. **Indefinite TTL**: Feeds should be cached indefinitely until manually refreshed by the user.
4. **Targeted Invalidation**: Refreshing one feed should not clear the cache for other feeds.

## Current Implementation: Two-Layer Caching (In-Process + `unstable_cache`)

After numerous failed attempts with single-layer solutions, the current architecture uses a robust two-layer approach:

### Layer 1: In-Process Global Map (The Fast Path)
We use a standard JavaScript `Map` initialized globally in the route handler. 
- **Why**: Handles the most common user behavior—rapidly switching between feeds within the same session. 
- **Benefit**: It provides sub-millisecond cache hits and bypasses all Next.js Data Cache complexities. On Vercel, this persists for the lifetime of the specific lambda container handling the requests.

### Layer 2: Persistent Data Cache via `unstable_cache` (The Fallback)
When a request hits a cold lambda (Layer 1 miss), we fallback to `unstable_cache` which writes to Vercel's persistent KV Data Cache.
- **Why**: Survives lambda cold starts and shares cache across different workers/deployments.
- **Implementation Detail**: We define `fetchRssData` statically at the module level. Next.js uses the function's static reference/AST (`cb.name`) to build the cache key. By using a named static function, the cache key is stable across all requests and deployments.

```typescript
// Layer 1: Fast in-process cache
const inProcessCache = new Map<string, { data: string; storedAt: number }>();

// Layer 2: Persistent cache function
async function fetchRssData(url: string): Promise<string> {
  const fetchPromise = fetch(url, { headers, cache: "no-store" });
  // Timeout handled via Promise.race, NOT by passing AbortSignal to fetch!
}

function makeCachedFetcher(url: string) {
  const tag = cacheTagForUrl(url);
  return unstable_cache(fetchRssData, [tag], { revalidate: false, tags: [tag] });
}
```

### Cache Invalidation (`revalidateTag`)

When a user clicks "Refresh", we must bypass the cache and fetch fresh data.
We invalidate **both** layers:
1. `inProcessCache.delete(urlString)`
2. `revalidateTag(cacheTagForUrl(urlString), { expire: 0 })`

**CRITICAL FIX**: Next.js 16 requires the second argument for `revalidateTag` to specify the profile or `{ expire: 0 }`. Calling `revalidateTag(tag)` with a single argument is deprecated and causes TypeScript build failures and unpredictable caching bypass loops where the tag is stuck in a "pending revalidation" state.

---

## Failed Implementations (The Loop of Doom)

Over several commits, the caching architecture bounced between different Next.js primitives that failed in production serverless environments. 

### ❌ Attempt 1: Dynamic `unstable_cache` wrapper
**What was tried**: Generating the `unstable_cache` with an inline arrow function dynamically on every request.
**Why it failed**: Next.js relies on the function's static reference/AST to generate the `Function ID` for the cache key. Because the function was created inline dynamically, the ID was unstable, resulting in a **cache miss on every single request**. Switching feeds always hit Reddit again, causing rate limits.

### ❌ Attempt 2: `fetchCache = 'force-cache'` Route Segment Config
**What was tried**: Exporting `const fetchCache = 'force-cache'` in the route handler and relying on Next.js's built-in `fetch(url, { cache: 'force-cache' })`.
**Why it failed**:
1. Next.js `fetch` cache bypassed the Data Cache completely because `signal: AbortSignal.timeout(...)` was passed to the `fetch` call. Next.js assumes custom signals mean the request isn't safely cacheable.
2. Even without the signal, Route Handlers that read dynamic data (like `request.nextUrl.searchParams`) are aggressively marked dynamic, and `force-cache` fetches often fallback to an isolated in-memory cache per lambda container. The cache expired as soon as the container was recycled ("expires very quickly").

### ❌ Attempt 3: `'use cache: remote'` (Next.js 16 Cache Components)
**What was tried**: Using the new `'use cache: remote'` directive which guarantees writing to the Vercel Data Cache.
**Why it failed**: This required enabling the `cacheComponents: true` experimental flag in `next.config.ts`. Doing so globally enabled Partial Prerendering (PPR) across the entire application. Since existing Server Components were not designed for PPR, it broke the application build and caused 500 errors in production.

### ❌ Attempt 4: In-Memory / File System (`fs`) Cache ONLY
**What was tried**: Storing feeds in a global `Map` or using `fs.writeFileSync` as the *only* caching mechanism.
**Why it failed**: Vercel serverless environments are ephemeral. A global `Map` is wiped as soon as the lambda scales down or a new one spins up. The filesystem (`fs`) is read-only except for `/tmp`, which also does not persist across different container invocations. (This is why Layer 1 requires Layer 2).

### ❌ Attempt 5: Single-Argument `revalidateTag(tag)`
**What was tried**: Calling `revalidateTag(tag)` without a second argument in a Route Handler.
**Why it failed**: In Next.js 16.2.7, this is deprecated and throws a TypeScript compilation error during build. Furthermore, in the Next.js cache architecture, it inadvertently flagged the request with `ActionDidRevalidateStaticAndDynamic`, leading to cache-bypass bugs during subsequent fetches in the same request lifecycle.

---

## Summary
When modifying the proxy, **never use inline functions with `unstable_cache`**, **never pass `AbortSignal` to `fetch` if you expect Next.js to cache it**, **never enable `cacheComponents: true`** until the entire app is refactored for Partial Prerendering, and **always pass `{ expire: 0 }` to `revalidateTag`**.
