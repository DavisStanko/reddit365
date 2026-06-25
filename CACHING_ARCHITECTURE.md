# Reddit365 Caching Architecture & Post-Mortem

This document serves as a comprehensive guide to the caching architecture in Reddit365, documenting the reasons behind the current implementation and detailing previous failed attempts. **Do not attempt to rewrite the caching logic without reading this document first.**

## The Problem

Reddit365 relies on Reddit's unauthenticated RSS feeds (`.rss`) to bypass CORS and API blocks for `.json` endpoints. Reddit aggressively rate-limits these RSS feeds (returning HTTP 429). To provide a responsive "Outlook-like" experience where users can quickly switch between feeds and view posts, the application **must** cache these feeds aggressively.

The requirements for caching are:
1. **Server-Side Only**: Feeds must be fetched and cached by the Next.js API proxy (`app/api/reddit/route.ts`).
2. **Persistent across invocations**: Because Vercel uses a serverless architecture, memory is isolated per lambda container and destroyed after inactivity. In-memory caches expire too quickly, resulting in frequent cache misses and rate limits when switching feeds.
3. **Indefinite TTL**: Feeds should be cached indefinitely until manually refreshed by the user.
4. **Targeted Invalidation**: Refreshing one feed should not clear the cache for other feeds.

## Current Implementation: Statically Referenced `unstable_cache`

The current approach uses Next.js's `unstable_cache` (which writes to the persistent Vercel Data Cache KV store) combined with a **static function reference**.

```typescript
import { unstable_cache, revalidateTag } from "next/cache";

// 1. Define the fetcher statically so Next.js assigns a stable Function ID.
async function fetchRssData(url: string): Promise<string> {
  const fetchPromise = fetch(url, {
    headers: REDDIT_REQUEST_HEADERS,
    cache: "no-store", // unstable_cache handles the caching layer
  });

  // Timeout handled via Promise.race, NOT by passing AbortSignal to fetch!
  // ...
}

// 2. Wrap it dynamically but reference the static function
function makeCachedFetcher(url: string) {
  const tag = cacheTagForUrl(url);
  return unstable_cache(
    fetchRssData, // STABLE REFERENCE
    [tag],
    { revalidate: false, tags: [tag] }
  );
}

// 3. Force refresh invalidates the specific tag
revalidateTag(cacheTagForUrl(urlString));
```

### Why this approach was chosen:
- **`unstable_cache`**: Correctly writes to Vercel Data Cache, surviving lambda cold starts.
- **Static Reference (`fetchRssData`)**: Next.js uses the function's source code/location (`cb.name`) to build the cache key. By using a named static function, the cache key is stable across all requests and deployments.
- **No `AbortSignal` in `fetch`**: Next.js 14/15's internal `fetch` patching completely opts out of Data Caching pipelines if an `AbortSignal` or custom agent is passed. We use `Promise.race` for timeouts instead.

---

## Failed Implementations (The Loop of Doom)

Over several commits, the caching architecture bounced between different Next.js primitives that failed in production serverless environments. 

### ❌ Attempt 1: Dynamic `unstable_cache` wrapper
**What was tried**: Generating the `unstable_cache` with an inline arrow function dynamically on every request.
```typescript
function makeCachedFetcher(url: string) {
  return unstable_cache(
    async () => { fetch(url) }, // Inline function!
    [tag], { tags: [tag] }
  );
}
```
**Why it failed**: Next.js relies on the function's static reference/AST to generate the `Function ID` for the cache key. Because the function was created inline dynamically, the ID was unstable, resulting in a **cache miss on every single request**. Switching feeds always hit Reddit again, causing rate limits.

### ❌ Attempt 2: `fetchCache = 'force-cache'` Route Segment Config
**What was tried**: Exporting `const fetchCache = 'force-cache'` in the route handler and relying on Next.js's built-in `fetch(url, { cache: 'force-cache' })`.
**Why it failed**:
1. Next.js `fetch` cache bypassed the Data Cache completely because `signal: AbortSignal.timeout(...)` was passed to the `fetch` call. Next.js assumes custom signals mean the request isn't safely cacheable.
2. Even without the signal, Route Handlers that read dynamic data (like `request.nextUrl.searchParams`) are aggressively marked dynamic, and `force-cache` fetches often fallback to an isolated in-memory cache per lambda container. The cache expired as soon as the container was recycled ("expires very quickly").

### ❌ Attempt 3: `'use cache: remote'` (Next.js 16 Cache Components)
**What was tried**: Using the new `'use cache: remote'` directive which guarantees writing to the Vercel Data Cache.
**Why it failed**: This required enabling the `cacheComponents: true` experimental flag in `next.config.ts`. Doing so globally enabled Partial Prerendering (PPR) across the entire application. Since existing Server Components were not designed for PPR, it broke the application build and caused 500 errors in production.

### ❌ Attempt 4: In-Memory / File System (`fs`) Cache
**What was tried**: Storing feeds in a global `Map` or using `fs.writeFileSync`.
**Why it failed**: Vercel serverless environments are ephemeral. A global `Map` is wiped as soon as the lambda scales down or a new one spins up. The filesystem (`fs`) is read-only except for `/tmp`, which also does not persist across different container invocations.

---

## Summary
When modifying the proxy, **never use inline functions with `unstable_cache`**, **never pass `AbortSignal` to `fetch` if you expect Next.js to cache it**, and **never enable `cacheComponents: true`** until the entire app is refactored for Partial Prerendering.
