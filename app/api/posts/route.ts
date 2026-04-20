import { type NextRequest, NextResponse } from "next/server";
import { fetchRedditPosts, type SortMode } from "@/lib/reddit-api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sub = searchParams.get("sub") ?? "all";
  const after = searchParams.get("after") ?? undefined;
  const sort = searchParams.get("sort") ?? "hot";
  const timeRange = searchParams.get("timeRange") ?? searchParams.get("t") ?? "day";
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "10", 10);
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 25)
      : 10;
  const refresh = searchParams.get("refresh") === "1";

  try {
    const data = await fetchRedditPosts(
      sub,
      sort as SortMode,
      after,
      limit,
      timeRange as never,
      { refresh },
    );
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/posts] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch posts from Reddit" },
      { status: 502 },
    );
  }
}
