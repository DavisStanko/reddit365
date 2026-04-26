import { type NextRequest, NextResponse } from "next/server";
import { fetchRedditPosts } from "@/lib/reddit-api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sub = searchParams.get("sub") ?? "all";
  const after = searchParams.get("after") ?? undefined;

  try {
    const data = await fetchRedditPosts(sub, after);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/posts] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch posts from Reddit" },
      { status: 502 }
    );
  }
}
