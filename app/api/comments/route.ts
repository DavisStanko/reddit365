import { type NextRequest, NextResponse } from "next/server";
import { fetchRedditComments } from "@/lib/reddit-api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const permalink = searchParams.get("permalink");

  if (!permalink) {
    return NextResponse.json({ error: "Missing permalink parameter" }, { status: 400 });
  }

  try {
    const comments = await fetchRedditComments(permalink);
    return NextResponse.json(comments);
  } catch (err) {
    console.error("[/api/comments] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments from Reddit" },
      { status: 502 }
    );
  }
}
