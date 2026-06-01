import { NextRequest, NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Server-side in-memory cache
// Prevents hammering Reddit when the same feed is requested rapidly.
// TTL: 60 seconds. Max 100 entries (LRU-lite: just drop oldest on overflow).
// ---------------------------------------------------------------------------
interface CacheEntry {
  text: string;
  timestamp: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds
const CACHE_MAX = 100;
const cache = new Map<string, CacheEntry>();

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.text;
}

function setCached(key: string, text: string) {
  if (cache.size >= CACHE_MAX) {
    // Drop the oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { text, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Proxy handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url param", { status: 400 });

  // Return cached response if fresh
  const cached = getCached(url);
  if (cached) {
    console.log("[Proxy] Serving from cache:", url.slice(0, 80));
    return new NextResponse(cached, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Reddit365/1.0; +https://github.com/reddit365)",
        "Accept": "application/rss+xml, application/atom+xml, text/xml, */*",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("[Proxy] Reddit returned:", res.status, text.slice(0, 200));
      return new NextResponse(text, { status: res.status });
    }

    setCached(url, text);
    console.log("[Proxy] Fetched and cached:", url.slice(0, 80));

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("[Proxy] Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
