import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// In-Memory Rate Limiter
// ---------------------------------------------------------------------------
interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitTracker>();
const RATE_LIMIT_MAX_REQUESTS = 120;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// Force-Refresh Cooldown
// ---------------------------------------------------------------------------
const lastRefreshTimes = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 30 * 1000; // 30 seconds

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
  } catch (err) {
    return new NextResponse("Invalid url format", { status: 400 });
  }

  // 2. Force-Refresh Cooldown Check
  if (forceRefresh) {
    const urlString = targetUrl.toString();
    const lastRefresh = lastRefreshTimes.get(urlString);
    
    if (lastRefresh && (now - lastRefresh < REFRESH_COOLDOWN_MS)) {
      console.warn(`[Proxy] Cooldown active for ${urlString}. Ignoring forceRefresh.`);
      // Strip the forceRefresh flag to serve the Next.js cache instead
      forceRefresh = false;
    } else {
      // Update the last refresh time
      lastRefreshTimes.set(urlString, now);
    }
  }

  // ---------------------------------------------------------------------------
  // Shared fetch headers for all upstream Reddit requests
  // ---------------------------------------------------------------------------
  const REDDIT_HEADERS = {
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

  // ---------------------------------------------------------------------------
  // Cached fetcher — uses unstable_cache (Next.js Data Cache) so the result
  // is stored in Vercel's persistent Data Cache and shared across all users
  // and serverless invocations. revalidate: false = indefinite TTL (FIFO
  // eviction managed by Next.js). This is the correct way to cache inside a
  // Route Handler; fetch() with cache: "force-cache" is unreliable here
  // because Route Handlers are dynamic routes (they read the request object
  // at runtime) and the Data Cache is not guaranteed to be hit.
  // ---------------------------------------------------------------------------
  const cachedFetch = unstable_cache(
    async (url: string) => {
      const res = await fetch(url, { headers: REDDIT_HEADERS, cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Reddit returned ${res.status}: ${text.slice(0, 200)}`);
      }
      return text;
    },
    // Cache key is derived from the URL — one entry per unique feed/comment URL.
    ["reddit-rss"],
    { revalidate: false }
  );

  try {
    let text: string;

    if (forceRefresh) {
      // Bypass the Data Cache entirely — fetch fresh and overwrite the cache
      // entry on next normal request (unstable_cache handles this naturally
      // since we only call the raw fetch here and the cache key stays intact).
      const res = await fetch(targetUrl.toString(), {
        headers: REDDIT_HEADERS,
        cache: "no-store",
      });
      text = await res.text();
      if (!res.ok) {
        console.error("[Proxy] Reddit returned:", res.status, text.slice(0, 200));
        return new NextResponse(text, { status: res.status });
      }
    } else {
      // Serve from / populate the persistent Data Cache.
      text = await cachedFetch(targetUrl.toString());
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("[Proxy] Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
