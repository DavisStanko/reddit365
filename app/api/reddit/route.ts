import { createHash } from "crypto";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// In-Memory Rate Limiter
// ---------------------------------------------------------------------------
interface RateLimitTracker {
  count: number;
  resetTime: number;
}

class UpstreamRedditError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Reddit returned ${status}`);
    this.name = "UpstreamRedditError";
    this.status = status;
    this.body = body;
  }
}

const rateLimits = new Map<string, RateLimitTracker>();
const RATE_LIMIT_MAX_REQUESTS = 120;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// Force-Refresh Cooldown
// ---------------------------------------------------------------------------
const lastRefreshTimes = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 30 * 1000; // 30 seconds
const UPSTREAM_TIMEOUT_MS = 30 * 1000;

const REDDIT_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function cacheTagForUrl(url: string): string {
  return `reddit-rss:${createHash("sha256").update(url).digest("hex")}`;
}

// ---------------------------------------------------------------------------
// Cached RSS fetcher — uses 'use cache: remote' (Next.js 16 Cache Components).
//
// WHY 'use cache: remote' and not fetch() + force-cache:
//   fetch() with cache: "force-cache" in a Route Handler uses an in-process
//   memory cache. In serverless environments (Vercel), each invocation runs in
//   an isolated container whose memory is destroyed after the request. This
//   means cache: "force-cache" provides zero persistence between requests —
//   effectively no cache at all.
//
//   'use cache: remote' routes through Vercel's remote cache handler (their
//   persistent Data Cache KV store), which IS shared across all serverless
//   instances and persists across invocations. This requires cacheComponents:
//   true in next.config.ts — without it, use cache directives are silently
//   ignored.
//
// cacheLife({ expire: 0 }): no time-based expiry — FIFO eviction only.
// cacheTag(tag): per-URL tag, enabling targeted invalidation on force-refresh.
// ---------------------------------------------------------------------------
async function fetchRedditRss(url: string): Promise<string> {
  "use cache: remote";

  const tag = cacheTagForUrl(url);
  cacheTag(tag);
  cacheLife({ expire: 0 }); // indefinite — no time-based expiry

  const res = await fetch(url, {
    headers: REDDIT_REQUEST_HEADERS,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: "no-store", // always fetch from Reddit; caching is handled by 'use cache: remote'
  });

  const text = await res.text();

  if (!res.ok) {
    throw new UpstreamRedditError(res.status, text);
  }

  return text;
}

export async function GET(request: NextRequest) {
  // 1. Rate Limiting Check
  const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
  const now = Date.now();
  
  let tracker = rateLimits.get(ip);
  if (!tracker || now > tracker.resetTime) {
    tracker = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimits.set(ip, tracker);
  } else {
    tracker.count++;
    if (tracker.count > RATE_LIMIT_MAX_REQUESTS) {
      console.warn(`[Proxy] Rate limit exceeded for IP: ${ip}`);
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  // Periodic garbage collection to prevent memory leaks from old IPs and old refresh times
  if (Math.random() < 0.05) {
    for (const [key, value] of rateLimits.entries()) {
      if (now > value.resetTime) {
        rateLimits.delete(key);
      }
    }
    for (const [url, time] of lastRefreshTimes.entries()) {
      if (now - time > REFRESH_COOLDOWN_MS) {
        lastRefreshTimes.delete(url);
      }
    }
  }

  const urlParam = request.nextUrl.searchParams.get("url");
  let forceRefresh = request.nextUrl.searchParams.get("forceRefresh") === "true";
  
  if (!urlParam) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  // URL Validation to prevent SSRF
  let targetUrl: URL;
  try {
    targetUrl = new URL(urlParam);
    if (targetUrl.hostname !== "old.reddit.com" && targetUrl.hostname !== "www.reddit.com") {
      return new NextResponse("Invalid url hostname", { status: 400 });
    }
    if (!targetUrl.pathname.endsWith(".rss")) {
      return new NextResponse("Invalid url path", { status: 400 });
    }
  } catch {
    return new NextResponse("Invalid url format", { status: 400 });
  }

  const urlString = targetUrl.toString();

  // 2. Force-Refresh Cooldown Check
  if (forceRefresh) {
    const lastRefresh = lastRefreshTimes.get(urlString);
    
    if (lastRefresh && (now - lastRefresh < REFRESH_COOLDOWN_MS)) {
      console.warn(`[Proxy] Cooldown active for ${urlString}. Ignoring forceRefresh.`);
      // Strip the forceRefresh flag to serve the remote cache instead
      forceRefresh = false;
    } else {
      // Immediately expire this URL's remote cache entry so the next
      // fetchRedditRss call fetches fresh data and repopulates the cache.
      revalidateTag(cacheTagForUrl(urlString), { expire: 0 });
      lastRefreshTimes.set(urlString, now);
    }
  }

  try {
    const text = await fetchRedditRss(urlString);

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    if (error instanceof UpstreamRedditError) {
      console.error("[Proxy] Reddit returned:", error.status, error.body.slice(0, 200));
      return new NextResponse(error.body, { status: error.status });
    }

    console.error("[Proxy] Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

