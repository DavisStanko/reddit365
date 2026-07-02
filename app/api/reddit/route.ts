import { NextRequest, NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";

// ---------------------------------------------------------------------------
// Rate Limiter
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

const UPSTREAM_TIMEOUT_MS = 30 * 1000;

const REDDIT_REQUEST_HEADERS: Record<string, string> = {
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
// Static Fetch Function (MUST be static for unstable_cache key stability)
// ---------------------------------------------------------------------------
async function fetchFromReddit(url: string): Promise<string> {
  console.log(`[Proxy] Fetching fresh data from Reddit for: ${url}`);

  const fetchPromise = fetch(url, {
    headers: REDDIT_REQUEST_HEADERS,
    cache: "no-store", // We manage cache explicitly via unstable_cache
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Upstream timeout")), UPSTREAM_TIMEOUT_MS)
  );

  const res = (await Promise.race([fetchPromise, timeoutPromise])) as Response;
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

  // Periodic garbage collection for rate limits
  if (Math.random() < 0.05) {
    for (const [key, value] of rateLimits.entries()) {
      if (now > value.resetTime) {
        rateLimits.delete(key);
      }
    }
  }

  const urlParam = request.nextUrl.searchParams.get("url");
  const forceRefresh = request.nextUrl.searchParams.get("forceRefresh") === "true";
  
  if (!urlParam) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  // URL Validation
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
  // Create a safe tag string
  const cacheTag = `reddit-${Buffer.from(urlString).toString("base64")}`;

  // 2. Handle Force Refresh
  if (forceRefresh) {
    console.log(`[Proxy] Force refresh requested, invalidating tag: ${cacheTag}`);
    // Use the exact parameters Next.js requires for on-demand revalidation
    revalidateTag(cacheTag, { expire: 0 });
  }

  // 3. Dynamic Cache Wrapper
  // We construct the wrapper inside the request to use dynamic tags, but we 
  // pass the STATIC `fetchFromReddit` function so `cb.toString()` is stable.
  const getCachedRedditFeed = unstable_cache(
    fetchFromReddit,
    ["reddit-proxy", urlString], // Stable key parts
    {
      revalidate: 31536000, // 1 year (effectively indefinite)
      tags: [cacheTag],
    }
  );

  // 4. Fetch (from cache or upstream)
  try {
    const text = await getCachedRedditFeed(urlString);

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400",
      },
    });
  } catch (error: unknown) {
    // unstable_cache throws if the underlying function throws.
    // Errors are NOT cached by unstable_cache, which is correct behavior for 429s.
    if (error instanceof UpstreamRedditError) {
      console.error("[Proxy] Reddit returned:", error.status, error.body.slice(0, 200));
      return new NextResponse(error.body, { status: error.status });
    }

    console.error("[Proxy] Error:", error);
    return new NextResponse(error instanceof Error ? error.message : String(error), { status: 500 });
  }
}
