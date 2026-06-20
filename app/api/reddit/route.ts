import { NextRequest, NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

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

  try {
    const fetchOptions: RequestInit = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Reddit365/1.0; +https://github.com/reddit365)",
        Accept: "application/rss+xml, application/atom+xml, text/xml, */*",
      },
    };

    if (forceRefresh) {
      fetchOptions.cache = "no-store";
    } else {
      // Use Next.js native Data Cache
      fetchOptions.next = { revalidate: 86400 }; // 24 hours
    }

    const res = await fetch(targetUrl.toString(), fetchOptions);

    const text = await res.text();

    if (!res.ok) {
      console.error("[Proxy] Reddit returned:", res.status, text.slice(0, 200));
      return new NextResponse(text, { status: res.status });
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("[Proxy] Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
