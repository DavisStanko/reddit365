import { NextRequest, NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  const forceRefresh = request.nextUrl.searchParams.get("forceRefresh") === "true";
  
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
