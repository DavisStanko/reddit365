import { type NextRequest, NextResponse } from "next/server";
import { fetchRedditComments } from "@/lib/reddit-api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const permalink = searchParams.get("permalink");
  const cursorParam = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");

  if (!permalink) {
    return NextResponse.json(
      { error: "Missing permalink parameter" },
      { status: 400 },
    );
  }

  try {
    const cursor = cursorParam ? Number.parseInt(cursorParam, 10) : 0;
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const comments = await fetchRedditComments(permalink, {
      cursor: Number.isFinite(cursor) ? cursor : 0,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json(comments);
  } catch (err) {
    console.error("[/api/comments] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments from Reddit" },
      { status: 502 },
    );
  }
}
