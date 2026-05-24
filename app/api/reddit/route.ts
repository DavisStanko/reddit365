import { NextRequest, NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url param", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Reddit365/1.0",
        "Accept": "*/*",
      },
    });
    
    const text = await res.text();
    if (!res.ok) {
      console.error("[Proxy] Reddit returned:", res.status, text.slice(0, 200));
      return new NextResponse(text, { status: res.status });
    }
    
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("[Proxy] Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
