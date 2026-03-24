import type { Post } from "./sample-posts";

/** Map a subreddit id from our folder pane to a Reddit API path */
function subToPath(sub: string, sort: string): string {
  const sortPath = sort === "new" || sort === "top" ? `/${sort}` : "";
  switch (sub) {
    case "frontpage":
      return `/${sort === "hot" ? "" : sort}.json`;
    case "all":
      return `/r/all${sortPath}.json`;
    case "popular":
      return `/r/popular${sortPath}.json`;
    default: {
      // strip leading "r/" if present, then reconstruct
      const name = sub.startsWith("r/") ? sub.slice(2) : sub;
      return `/r/${name}${sortPath}.json`;
    }
  }
}

/** Format a Reddit timestamp (unix seconds) to a human-friendly "Xh" / "Xd" string */
function formatAge(created_utc: number): string {
  const diffMs = Date.now() - created_utc * 1000;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

/** Format a score number compactly (e.g. 24500 → "24.5k") */
function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return String(score);
}

/** Shape returned from our API route */
export interface PostsResponse {
  posts: Post[];
  after: string | null;
}

/** Fetch posts from Reddit's public JSON API (server-side use) */
export async function fetchRedditPosts(
  sub: string,
  sort = "hot",
  after?: string | null,
  limit = 25
): Promise<PostsResponse> {
  const path = subToPath(sub, sort);
  const params = new URLSearchParams({ limit: String(limit), raw_json: "1" });
  if (after) params.set("after", after);

  const url = `https://www.reddit.com${path}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      // Reddit requires a descriptive User-Agent for API usage
      "User-Agent": "reddit365/1.0 (Next.js app; educational project)",
    },
    next: { revalidate: 60 }, // cache for 60s in Next.js data cache
  });

  if (!res.ok) {
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();
  const children = json?.data?.children ?? [];
  const nextAfter: string | null = json?.data?.after ?? null;

  const posts: Post[] = children
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => c.kind === "t3") // text/link posts only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any, idx: number): Post => {
      const d = c.data;
      const subreddit = `r/${d.subreddit}`;
      // Body: prefer selftext, fall back to url for link posts
      const body: string =
        d.selftext && d.selftext.trim()
          ? d.selftext
          : d.url && !d.url.startsWith("https://www.reddit.com")
          ? `[Link post] ${d.url}`
          : "(No body text)";

      // Image: try thumbnail, then preview
      let imageUrl: string | undefined;
      if (
        d.post_hint === "image" &&
        d.url &&
        /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(d.url)
      ) {
        imageUrl = d.url;
      } else if (d.preview?.images?.[0]?.source?.url) {
        // Reddit HTML-encodes the preview URLs
        imageUrl = d.preview.images[0].source.url.replace(/&amp;/g, "&");
      }

      return {
        id: idx, // use index as numeric id; full id in name field
        title: d.title,
        subreddit,
        author: d.author,
        time: formatAge(d.created_utc),
        score: formatScore(d.score),
        comments: d.num_comments ?? 0,
        body,
        imageUrl,
        permalink: d.permalink,
      };
    });

  return { posts, after: nextAfter };
}

/** Fetch comments for a specific post permalink */
export async function fetchRedditComments(permalink: string): Promise<import("./sample-posts").RedditComment[]> {
  // Strip trailing slash if present, then append .json
  const path = permalink.endsWith("/") ? permalink.slice(0, -1) : permalink;
  const url = `https://www.reddit.com${path}.json?raw_json=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "reddit365/1.0 (Next.js app; educational project)",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();
  
  // Reddit returns an array of 2 items: [0] = post, [1] = comments
  if (!Array.isArray(json) || json.length < 2) return [];

  const commentsData = json[1]?.data?.children ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapComment(c: any): import("./sample-posts").RedditComment | null {
    if (c.kind !== "t1") return null; // t1 = comment
    const d = c.data;
    if (!d || !d.body) return null;

    let replies: import("./sample-posts").RedditComment[] = [];
    if (d.replies && d.replies.data && d.replies.data.children) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replies = d.replies.data.children.map(mapComment).filter(Boolean) as import("./sample-posts").RedditComment[];
    }

    return {
      id: d.id,
      author: d.author,
      time: formatAge(d.created_utc),
      score: formatScore(d.score),
      body: d.body,
      replies: replies.length > 0 ? replies : undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return commentsData.map(mapComment).filter(Boolean) as import("./sample-posts").RedditComment[];
}
