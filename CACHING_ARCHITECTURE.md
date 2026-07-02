# Reddit365 Caching Architecture & Post-Mortem

> **🚨 AGENT WARNING: READ BEFORE TOUCHING CACHE 🚨**
> 1. **MANDATORY READING:** You MUST read this entire document before making any changes to data fetching or caching.
> 2. **APPEND-ONLY HISTORY:** This document is a historical record of failures. **NEVER delete past failed attempts from this file.** If you try a new approach that fails, you MUST add it to the "Failed Implementations" list with a post-mortem.
> 3. **DO NOT ASSUME IT'S FIXED:** Next.js caching is notoriously difficult in serverless environments. Even if you think you fixed a cache issue, do not assume it will work in production. Always test thoroughly and leave a trail of documentation.

## The Problem

Reddit365 relies on Reddit's unauthenticated RSS feeds (`.rss`) to bypass CORS and API blocks for `.json` endpoints. Reddit aggressively rate-limits these RSS feeds (returning HTTP 429). To provide a responsive "Outlook-like" experience where users can quickly switch between feeds and view posts, the application **must** cache these feeds aggressively.

The requirements for caching are:
1. **Server-Side Only**: Feeds must be fetched and cached by the Next.js API proxy (`app/api/reddit/route.ts`).
2. **Persistent across invocations**: Because Vercel uses a serverless architecture, memory is isolated per lambda container and destroyed after inactivity. In-memory caches alone expire too quickly, resulting in frequent cache misses and rate limits when switching feeds.
3. **Indefinite TTL**: Feeds should be cached indefinitely until manually refreshed by the user.
4. **Targeted Invalidation**: Refreshing one feed should not clear the cache for other feeds.
5. **Cross-User Consistency**: A feed cached by User A in one browser should be immediately available to User B in another browser without triggering a new Reddit fetch.

## Current Implementation: `unstable_cache` with Static Function Reference

After numerous failed attempts, the current architecture uses a carefully constructed `unstable_cache` wrapper that ensures cache keys are perfectly stable across requests and deployments, successfully utilizing Vercel's Data Cache.

### The Solution
We define the underlying fetch function (`fetchFromReddit`) **statically at the module level**, outside of the request handler.

When the request comes in, we dynamically construct the `unstable_cache` wrapper inside the request scope so that we can assign a **dynamic tag** (specific to the requested URL). By passing the static `fetchFromReddit` function into the wrapper, `unstable_cache` uses the function's static string representation for its internal key (`cb.toString()`). Combined with explicit `keyParts`, this guarantees the cache key will not change across requests, completely preventing the "Loop of Doom" cache misses.

```typescript
// 1. Defined statically outside the route handler
async function fetchFromReddit(url: string): Promise<string> {
  const fetchPromise = fetch(url, { headers, cache: "no-store" });
  // Timeout handled via Promise.race, NOT by passing AbortSignal to fetch!
}

export async function GET(request: NextRequest) {
  const urlString = targetUrl.toString();
  const cacheTag = `reddit-${Buffer.from(urlString).toString("base64")}`;

  // 2. Dynamic Wrapper, Static Function
  const getCachedRedditFeed = unstable_cache(
    fetchFromReddit, 
    ["reddit-proxy", urlString], // Stable key parts
    {
      revalidate: 31536000, // 1 year
      tags: [cacheTag],
    }
  );

  const data = await getCachedRedditFeed(urlString);
}
```

### Cache Invalidation (`revalidateTag`)

When a user clicks "Refresh", the client passes `forceRefresh=true`. The proxy intercepts this and calls:
`revalidateTag(cacheTag, { expire: 0 })`

**CRITICAL FIX**: Next.js 16 requires the second argument for `revalidateTag` to specify `{ expire: 0 }`. Calling `revalidateTag(tag)` with a single argument is deprecated and causes TypeScript build failures.

---

## Failed Implementations (The Loop of Doom)

Over several commits, the caching architecture bounced between different Next.js primitives that failed in production serverless environments. This list is preserved to prevent repeating the same mistakes.

### ❌ Attempt 1: Dynamic `unstable_cache` wrapper (Inline Function)
**What was tried**: Generating the `unstable_cache` with an inline arrow function dynamically on every request:
`unstable_cache(async () => fetchFromReddit(url), ...)`
**Why it failed**: Next.js relies on the function's stringified representation (`cb.toString()`) to generate the `Function ID` for the cache key. Because the function was created inline dynamically (and captured closures), the ID was unstable, resulting in a **cache miss on every single request**. Switching feeds always hit Reddit again.

### ❌ Attempt 2: `fetchCache = 'force-cache'` Route Segment Config
**What was tried**: Exporting `const fetchCache = 'force-cache'` in the route handler and relying on Next.js's built-in `fetch(url, { cache: 'force-cache' })`.
**Why it failed**:
1. Next.js `fetch` cache bypassed the Data Cache completely because `signal: AbortSignal.timeout(...)` was passed to the `fetch` call. Next.js assumes custom signals mean the request isn't safely cacheable.
2. Even without the signal, Route Handlers that read dynamic data (like `request.nextUrl.searchParams`) are aggressively marked dynamic, and `force-cache` fetches often fallback to an isolated in-memory cache per lambda container. The cache expired as soon as the container was recycled.

### ❌ Attempt 3: `'use cache: remote'` (Next.js 16 Cache Components)
**What was tried**: Using the new `'use cache: remote'` directive which guarantees writing to the Vercel Data Cache.
**Why it failed**: This required enabling the `cacheComponents: true` experimental flag in `next.config.ts`. Doing so globally enabled Partial Prerendering (PPR) across the entire application. Since existing Server Components were not designed for PPR, it broke the application build and caused 500 errors in production.

### ❌ Attempt 4: In-Memory / File System (`fs`) Cache ONLY
**What was tried**: Storing feeds in a global `Map` or using `fs.writeFileSync` as the *only* caching mechanism.
**Why it failed**: Vercel serverless environments are ephemeral. A global `Map` is wiped as soon as the lambda scales down or a new one spins up. The filesystem (`fs`) is read-only except for `/tmp`, which also does not persist across different container invocations.

### ❌ Attempt 5: Single-Argument `revalidateTag(tag)`
**What was tried**: Calling `revalidateTag(tag)` without a second argument in a Route Handler.
**Why it failed**: In Next.js 16.2.7, this is deprecated and throws a TypeScript compilation error during build. Furthermore, in the Next.js cache architecture, it inadvertently flagged the request with `ActionDidRevalidateStaticAndDynamic`, leading to cache-bypass bugs.

### ❌ Attempt 6: Client-Side Primary Caching (The "Local" Cache)
**What was tried**: Maintaining a module-level `Map` inside the React `useReddit` hook, serving feeds instantly from the browser's memory without hitting the API proxy at all.
**Why it failed**: The requirements dictate that caching must be entirely server-side to minimize requests *across all users*. A client-side cache means that if User A loads a feed, and User B loads the same feed, the API proxy still hits Reddit twice. If User A opens an incognito window, it hits Reddit a third time. The server-side cache must be robust enough to handle the load globally.

---

## Summary
When modifying the proxy, **never use inline functions with `unstable_cache`**, **never pass `AbortSignal` to `fetch` if you expect Next.js to cache it**, **never enable `cacheComponents: true`** until the entire app is refactored for Partial Prerendering, and **always pass `{ expire: 0 }` to `revalidateTag`**.
