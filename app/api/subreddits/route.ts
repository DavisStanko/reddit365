import { type NextRequest, NextResponse } from "next/server";
import { fetchRedditSubreddits } from "@/lib/reddit-api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const after = searchParams.get("after") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 25;

  try {
    const data = await fetchRedditSubreddits(
      after,
      Number.isFinite(limit) ? limit : 25,
    );
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/subreddits] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch subreddits from Reddit" },
      { status: 502 },
    );
  }
}
