import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Disk-persisted cache
// Survives dev server restarts. TTL: 24 hours (posts are stale but usable).
// Cache file lives at .next/reddit-cache.json — git-ignored, auto-created.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE = path.join(process.cwd(), ".next", "reddit-cache.json");

interface CacheEntry {
  text: string;
  timestamp: number;
}

type CacheStore = Record<string, CacheEntry>;

// Load cache from disk once at module init
let store: CacheStore = {};
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    store = JSON.parse(raw) as CacheStore;
    console.log(`[Proxy] Loaded disk cache (${Object.keys(store).length} entries)`);
  }
} catch {
  store = {};
}

function getCached(key: string): string | null {
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    delete store[key];
    return null;
  }
  return entry.text;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function setCached(key: string, text: string) {
  store[key] = { text, timestamp: Date.now() };
  // Debounce disk writes — flush at most once per 2 seconds
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(store), "utf-8");
    } catch (e) {
      console.warn("[Proxy] Failed to write cache to disk:", e);
    }
  }, 2000);
}

// ---------------------------------------------------------------------------
// Proxy handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url param", { status: 400 });

  // Serve from cache if present and fresh (up to 24h)
  const cached = getCached(url);
  if (cached) {
    console.log("[Proxy] Cache HIT:", url.slice(0, 80));
    return new NextResponse(cached, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Reddit365/1.0; +https://github.com/reddit365)",
        Accept: "application/rss+xml, application/atom+xml, text/xml, */*",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("[Proxy] Reddit returned:", res.status, text.slice(0, 200));
      return new NextResponse(text, { status: res.status });
    }

    setCached(url, text);
    console.log("[Proxy] Cache MISS, fetched and saved:", url.slice(0, 80));

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("[Proxy] Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
