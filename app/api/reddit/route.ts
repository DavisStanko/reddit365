import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

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
// Cached fetcher — uses "use cache: remote" so the result is stored in
// Vercel's persistent remote Data Cache and shared across all users and
// serverless invocations. This replaces the deprecated unstable_cache
// approach which only stored in ephemeral in-memory cache that was destroyed
// between serverless invocations.
//
// cacheLife("max") = indefinite TTL (revalidate: 30 days, expire: 1 year).
// cacheTag() per URL enables targeted invalidation via revalidateTag().
// ---------------------------------------------------------------------------
async function fetchRedditRSS(url: string): Promise<string> {
  "use cache: remote";

  const { cacheLife, cacheTag } = await import("next/cache");
  cacheLife("max");
  cacheTag(cacheTagForUrl(url));

  const res = await fetch(url, { headers: REDDIT_HEADERS, cache: "no-store" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Reddit returned ${res.status}: ${text.slice(0, 200)}`);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Deterministic cache tag from a Reddit RSS URL.
// Tags are limited to 256 chars, so we hash long URLs.
// ---------------------------------------------------------------------------
function cacheTagForUrl(url: string): string {
  // Simple deterministic hash: prefix + condensed URL
  const condensed = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 200);
  return `rss_${condensed}`;
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
  } catch (err) {
    return new NextResponse("Invalid url format", { status: 400 });
  }

  // 2. Force-Refresh Cooldown Check
  if (forceRefresh) {
    const urlString = targetUrl.toString();
    const lastRefresh = lastRefreshTimes.get(urlString);
    
    if (lastRefresh && (now - lastRefresh < REFRESH_COOLDOWN_MS)) {
      console.warn(`[Proxy] Cooldown active for ${urlString}. Ignoring forceRefresh.`);
      // Strip the forceRefresh flag to serve the cache instead
      forceRefresh = false;
    } else {
      // Update the last refresh time
      lastRefreshTimes.set(urlString, now);
    }
  }

  try {
    if (forceRefresh) {
      // Invalidate the remote cache entry for this URL, then re-fetch.
      // revalidateTag with { expire: 0 } immediately expires the entry so
      // the next call to fetchRedditRSS will miss cache and fetch fresh.
      const tag = cacheTagForUrl(targetUrl.toString());
      revalidateTag(tag, { expire: 0 });
    }

    // Serve from / populate the persistent remote Data Cache.
    // If forceRefresh just expired the tag above, this call will miss
    // the cache and fetch fresh data from Reddit, then cache it.
    const text = await fetchRedditRSS(targetUrl.toString());

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
