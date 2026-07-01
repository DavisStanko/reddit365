# Reddit365 Caching Architecture & Post-Mortem

This document serves as a comprehensive guide to the caching architecture in Reddit365, documenting the reasons behind the current implementation and detailing previous failed attempts. **Do not attempt to rewrite the caching logic without reading this document first.**

## The Problem

Reddit365 relies on Reddit's unauthenticated RSS feeds (`.rss`) to bypass CORS and API blocks for `.json` endpoints. Reddit aggressively rate-limits these RSS feeds (returning HTTP 429). To provide a responsive "Outlook-like" experience where users can quickly switch between feeds and view posts, the application **must** cache these feeds aggressively.

The requirements for caching are:
1. **No redundant network calls**: Switching between previously loaded feeds must be instant — no loading spinners, no network calls.
2. **Persistent within a session**: Once a feed is loaded, it should remain cached until the user explicitly refreshes or closes the browser tab.
3. **Targeted Invalidation**: Refreshing one feed should not clear the cache for other feeds.

## Current Implementation: Client-Side Primary + Server In-Process Fallback

After numerous failed attempts with Next.js Data Cache primitives, the current architecture uses a fundamentally different approach: **the browser IS the cache**.

### Layer 1: Client-Side Module Map (PRIMARY — `lib/use-reddit.ts`)

Two module-level `Map` instances persist for the entire browser session:
- `postsCache: Map<string, Post[]>` — keyed by `"feed::sort"` (e.g., `"popular::hot"`)
- `commentsCache: Map<string, FlatComment[]>` — keyed by post permalink

**How it works:**
1. When a feed is first loaded, posts are fetched from `/api/reddit` and stored in `postsCache`.
2. When the user switches to a different feed and then switches back, `postsCache` serves the data **instantly** — no network call at all. The `useEffect` that would normally fetch posts detects the cache hit and returns early.
3. Comments follow the same pattern: once loaded, they're cached and restored when the user navigates back to the same post.
4. **Force-refresh** (via the refresh button) clears the client cache entry for that specific feed+sort, then fetches with `forceRefresh=true` to also bypass the server cache.

**Why this works and server-side caching didn't:**
- The browser is a single, long-lived process. A `Map` in module scope persists for the entire page session — there is no cold start, no lambda recycling, no container eviction.
- This approach eliminates not just Reddit API calls but also `/api/reddit` proxy calls. The client never hits the server at all for cached feeds.
- Zero dependency on Next.js Data Cache internals, `unstable_cache`, `revalidateTag`, or any other framework-specific caching primitive.

### Layer 2: Server In-Process Map (FALLBACK — `app/api/reddit/route.ts`)

A global `Map<string, InProcessCacheEntry>` in the API proxy serves as a secondary cache:
- **In dev**: persists for the entire dev server session.
- **On Vercel**: persists for the lifetime of the lambda container (minutes to hours depending on traffic).

This layer catches requests that miss the client cache (e.g., first page load, hard refresh). It does NOT use any Next.js Data Cache primitives — just a plain JavaScript Map.

### Cache Invalidation

| Action | Client Cache | Server Cache |
|---|---|---|
| Switch feed | ❌ preserved | Not consulted |
| Change sort (Hot/New/Top) | ❌ preserved (separate key) | Not consulted |
| Click refresh button | ✅ cleared (this feed only) | ✅ cleared (this URL only) |
| Page refresh (F5) | ✅ cleared (all, fresh page) | ❌ preserved |
| Close tab | ✅ cleared (all) | ❌ preserved |

---

## Failed Implementations (The Loop of Doom)

Over several commits, the caching architecture bounced between different Next.js primitives that failed in production serverless environments. The server-side-only approach was fundamentally flawed because **no Next.js caching primitive reliably persists data across serverless function invocations** without enabling `cacheComponents: true`, which breaks the app.

### ❌ Attempt 1: Dynamic `unstable_cache` wrapper
**What was tried**: Generating the `unstable_cache` wrapper with an inline arrow function dynamically on every request.
**Why it failed**: Next.js relies on the function's static reference/AST to generate the `Function ID` for the cache key. Because the function was created inline dynamically, the ID was unstable, resulting in a **cache miss on every single request**. Switching feeds always hit Reddit again, causing rate limits.

### ❌ Attempt 2: `fetchCache = 'force-cache'` Route Segment Config
**What was tried**: Exporting `const fetchCache = 'force-cache'` in the route handler and relying on Next.js's built-in `fetch(url, { cache: 'force-cache' })`.
**Why it failed**:
1. Next.js `fetch` cache bypassed the Data Cache completely because `signal: AbortSignal.timeout(...)` was passed to the `fetch` call. Next.js assumes custom signals mean the request isn't safely cacheable.
2. Even without the signal, Route Handlers that read dynamic data (like `request.nextUrl.searchParams`) are aggressively marked dynamic, and `force-cache` fetches often fallback to an isolated in-memory cache per lambda container. The cache expired as soon as the container was recycled ("expires very quickly").

### ❌ Attempt 3: `'use cache: remote'` (Next.js 16 Cache Components)
**What was tried**: Using the new `'use cache: remote'` directive which guarantees writing to the Vercel Data Cache.
**Why it failed**: This required enabling the `cacheComponents: true` experimental flag in `next.config.ts`. Doing so globally enabled Partial Prerendering (PPR) across the entire application. Since existing Server Components were not designed for PPR, it broke the application build and caused 500 errors in production.

### ❌ Attempt 4: In-Memory / File System (`fs`) Cache ONLY (Server-Side)
**What was tried**: Storing feeds in a global `Map` or using `fs.writeFileSync` as the *only* caching mechanism.
**Why it failed**: Vercel serverless environments are ephemeral. A global `Map` is wiped as soon as the lambda scales down or a new one spins up. The filesystem (`fs`) is read-only except for `/tmp`, which also does not persist across different container invocations.

### ❌ Attempt 5: Single-Argument `revalidateTag(tag)`
**What was tried**: Calling `revalidateTag(tag)` without a second argument in a Route Handler.
**Why it failed**: In Next.js 16.2.7, this is deprecated and throws a TypeScript compilation error during build. Furthermore, in the Next.js cache architecture, it inadvertently flagged the request with `ActionDidRevalidateStaticAndDynamic`, leading to cache-bypass bugs during subsequent fetches in the same request lifecycle.

### ❌ Attempt 6: Two-Layer Caching (In-Process Map + `unstable_cache` with Static Function)
**What was tried**: The most sophisticated server-side approach — a two-layer system combining an in-process `Map` (L1) with `unstable_cache` using a static named function reference (L2). Tags were per-URL hashes, `revalidate: false` for indefinite TTL, and `revalidateTag(tag, { expire: 0 })` for targeted invalidation.
**Why it failed**:
1. **`unstable_cache` never actually persisted data.** The `.next/cache/fetch-cache/` directory was never created. Despite the function being static and the cache key being stable, `unstable_cache` in a Route Handler context (workUnitStore type `'request'`) went through a code path (line 144-146 of `unstable-cache.js`) that checked `workStore.isOnDemandRevalidate` and `incrementalCache.isOnDemandRevalidate`. These flags were sometimes set by framework internals, causing the cache to be bypassed entirely.
2. **`revalidateTag` in the same request poisoned subsequent `unstable_cache` reads.** When `revalidateTag(tag, { expire: 0 })` was called (for force-refresh), it added the tag to `workStore.pendingRevalidatedTags`. Later in the same request, when `unstable_cache` tried to read from the Data Cache, the `IncrementalCache.get()` method checked `pendingRevalidatedTags` and found the recently revalidated tag → returned `null` (cache miss) → called `fetchRssData` again. This was by design in Next.js (to prevent reading your own stale writes), but it made force-refresh always double-fetch.
3. **In dev mode with Turbopack**, the `cb.toString()` used in the cache key could change across HMR recompilations, making cache keys unstable.
4. **Net effect**: L2 provided zero actual caching benefit. Every request that missed L1 also missed L2 and fetched from Reddit. L1 (in-process Map) was doing all the work, and it died with the process.

---

## Summary: Rules for Future Developers

1. **DO NOT use `unstable_cache` in Route Handlers.** It has been deprecated in Next.js 16 and replaced by `use cache`, but `use cache` requires `cacheComponents: true` which breaks the app. The `unstable_cache` function in Route Handlers goes through code paths that make caching unreliable.

2. **DO NOT try to persist server-side cache across Vercel lambda invocations** without `cacheComponents: true`. The Next.js Data Cache (`fetch` with `force-cache`, `unstable_cache`, etc.) does not reliably persist in Route Handlers on serverless. Do not add a client-side-only cache layer, custom disk cache, or Redis/KV store without a very compelling reason — the client-side Map approach is sufficient.

3. **The client-side cache is the primary layer.** The browser is the only reliable long-lived process. A `Map` in module scope persists for the entire page session. Treat the server cache as a nice-to-have optimization for first loads, not as the primary caching mechanism.

4. **Never cache error responses.** The server cache (and client cache) only stores successful responses. 429 errors should be retried via the client-side `fetchWithRetry` mechanism, not cached.

5. **Force-refresh must clear BOTH caches.** `refreshPosts` clears the client cache entry and passes `forceRefresh=true` to bypass the server cache. `refreshComments` follows the same pattern.
