import type { Post, RedditComment } from "./sample-posts";

interface RedditPostData {
  url_overridden_by_dest?: string;
  url?: string;
  is_video?: boolean;
  secure_media?: {
    reddit_video?: {
      fallback_url?: string;
    };
  };
  media?: {
    reddit_video?: {
      fallback_url?: string;
    };
  };
  is_gallery?: boolean;
  gallery_data?: {
    items?: Array<{ media_id?: string }>;
  };
  media_metadata?: Record<string, { s?: { u?: string } }>;
  preview?: {
    images?: Array<{ source?: { url?: string } }>;
  };
}

interface RedditSubredditNode {
  kind?: string;
  data?: {
    display_name?: string;
    url?: string;
    subscribers?: number;
    public_description?: string;
    title?: string;
  };
}

interface RedditPostNode {
  kind?: string;
  data: RedditPostData & {
    title?: string;
    subreddit?: string;
    author?: string;
    created_utc?: number;
    score?: number;
    num_comments?: number;
    selftext?: string;
    permalink?: string;
  };
}

interface RedditCommentNode {
  kind?: string;
  data: {
    id?: string;
    author?: string;
    created_utc?: number;
    score?: number;
    body?: string;
    replies?:
      | {
          data?: {
            children?: RedditCommentNode[];
          };
        }
      | string;
  };
}

const FALLBACK_AFTER_PREFIX = "mock:";
const COMMENT_PAGE_SIZE = 5;
const COMMENT_CACHE_TTL_MS = 5 * 60 * 1000;

export type SortMode = "hot" | "new" | "top";
export type TopTimeRange = "hour" | "day" | "week" | "month" | "year" | "all";

const TOP_TIME_RANGE_VALUES: TopTimeRange[] = [
  "hour",
  "day",
  "week",
  "month",
  "year",
  "all",
];

const COMMENT_CACHE = new Map<
  string,
  { expiresAt: number; comments: RedditCommentPageItem[] }
>();

export interface RedditCommentPageItem extends RedditComment {
  depth: number;
}

export interface RedditCommentPage {
  comments: RedditCommentPageItem[];
  nextCursor: string | null;
}

function unescapeRedditUrl(url: string): string {
  return url.replace(/&amp;/g, "&");
}

function looksLikeImageUrl(url?: string): boolean {
  return !!url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

function parseCompactNumber(value: string): number {
  const normalized = value.trim().toLowerCase().replace(/,/g, "");
  const match = normalized.match(/^(\d+(?:\.\d+)?)([km])?$/);

  if (!match) return 0;

  const amount = Number.parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === "k") return amount * 1000;
  if (suffix === "m") return amount * 1000000;
  return amount;
}

function parseRelativeAgeMinutes(value: string): number | null {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)(m|h|d)$/);

  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  const unit = match[2];

  if (unit === "m") return amount;
  if (unit === "h") return amount * 60;
  return amount * 60 * 24;
}

function getTopTimeWindowMinutes(timeRange: TopTimeRange): number | null {
  switch (timeRange) {
    case "hour":
      return 60;
    case "day":
      return 60 * 24;
    case "week":
      return 60 * 24 * 7;
    case "month":
      return 60 * 24 * 30;
    case "year":
      return 60 * 24 * 365;
    case "all":
      return null;
  }
}

function rankFallbackPost(
  post: Post,
  sort: SortMode,
  timeRange: TopTimeRange,
): number {
  const score = parseCompactNumber(post.score);
  const ageMinutes = parseRelativeAgeMinutes(post.time);
  const ageHours = ageMinutes === null ? 0 : ageMinutes / 60;

  if (sort === "new") {
    return -(ageMinutes ?? Number.POSITIVE_INFINITY);
  }

  if (sort === "top") {
    const windowMinutes = getTopTimeWindowMinutes(timeRange);
    const recencyBoost =
      windowMinutes && ageMinutes !== null
        ? Math.max(0, 1 - ageMinutes / windowMinutes)
        : 0;

    return score * (1 + recencyBoost * 0.2) + recencyBoost * 100;
  }

  return score / Math.pow(ageHours + 2, 1.25);
}

function sortFallbackPosts(
  posts: Post[],
  sort: SortMode,
  timeRange: TopTimeRange,
): Post[] {
  return [...posts].sort((left, right) => {
    const rightRank = rankFallbackPost(right, sort, timeRange);
    const leftRank = rankFallbackPost(left, sort, timeRange);

    if (rightRank !== leftRank) return rightRank - leftRank;
    return parseCompactNumber(right.score) - parseCompactNumber(left.score);
  });
}

function getPostMedia(
  d: RedditPostData,
): Pick<Post, "imageUrl" | "mediaUrl" | "mediaType"> {
  const directUrl = d.url_overridden_by_dest || d.url;

  if (d.is_video) {
    const videoUrl =
      d.secure_media?.reddit_video?.fallback_url ||
      d.media?.reddit_video?.fallback_url;

    if (videoUrl) {
      return { mediaUrl: videoUrl, mediaType: "video" };
    }
  }

  if (d.is_gallery) {
    const firstItemId = d.gallery_data?.items?.[0]?.media_id;
    const galleryUrl = firstItemId && d.media_metadata?.[firstItemId]?.s?.u;

    if (galleryUrl) {
      const imageUrl = unescapeRedditUrl(galleryUrl);
      return { imageUrl, mediaUrl: imageUrl, mediaType: "image" };
    }
  }

  if (looksLikeImageUrl(directUrl)) {
    return { imageUrl: directUrl, mediaUrl: directUrl, mediaType: "image" };
  }

  const previewUrl = d.preview?.images?.[0]?.source?.url;
  if (previewUrl) {
    const imageUrl = unescapeRedditUrl(previewUrl);
    return { imageUrl, mediaUrl: imageUrl, mediaType: "image" };
  }

  return {};
}

export interface SubredditListing {
  id: string;
  label: string;
  subscribers: number;
  description: string;
}

interface SubredditResponse {
  subreddits: SubredditListing[];
  after: string | null;
}

const FALLBACK_SUBREDDITS: SubredditListing[] = [
  {
    id: "askreddit",
    label: "r/AskReddit",
    subscribers: 46000000,
    description: "Questions and discussion",
  },
  {
    id: "worldnews",
    label: "r/worldnews",
    subscribers: 40000000,
    description: "Global news",
  },
  {
    id: "programming",
    label: "r/programming",
    subscribers: 4400000,
    description: "Programming news and discussion",
  },
  {
    id: "technology",
    label: "r/technology",
    subscribers: 18000000,
    description: "Tech news and updates",
  },
  {
    id: "science",
    label: "r/science",
    subscribers: 32000000,
    description: "Science news and discussion",
  },
  {
    id: "gaming",
    label: "r/gaming",
    subscribers: 45000000,
    description: "Gaming news and discussion",
  },
  {
    id: "movies",
    label: "r/movies",
    subscribers: 38000000,
    description: "Movie discussion",
  },
  {
    id: "music",
    label: "r/music",
    subscribers: 34000000,
    description: "Music discussion and recommendations",
  },
  {
    id: "todayilearned",
    label: "r/todayilearned",
    subscribers: 35500000,
    description: "Interesting facts",
  },
  {
    id: "funny",
    label: "r/funny",
    subscribers: 62000000,
    description: "Funny content",
  },
  {
    id: "pics",
    label: "r/pics",
    subscribers: 31000000,
    description: "Photos and images",
  },
  {
    id: "news",
    label: "r/news",
    subscribers: 30000000,
    description: "News discussion",
  },
  {
    id: "aww",
    label: "r/aww",
    subscribers: 37000000,
    description: "Cute animals",
  },
  {
    id: "gifs",
    label: "r/gifs",
    subscribers: 33000000,
    description: "GIFs and clips",
  },
  {
    id: "dataisbeautiful",
    label: "r/dataisbeautiful",
    subscribers: 24000000,
    description: "Data visualizations",
  },
  {
    id: "space",
    label: "r/space",
    subscribers: 28000000,
    description: "Space news and imagery",
  },
  {
    id: "history",
    label: "r/history",
    subscribers: 17000000,
    description: "History discussion",
  },
  {
    id: "books",
    label: "r/books",
    subscribers: 24000000,
    description: "Book recommendations",
  },
  {
    id: "food",
    label: "r/food",
    subscribers: 22000000,
    description: "Food and cooking",
  },
  {
    id: "fitness",
    label: "r/fitness",
    subscribers: 13000000,
    description: "Fitness discussion",
  },
  {
    id: "personalfinance",
    label: "r/personalfinance",
    subscribers: 22000000,
    description: "Money and budgeting",
  },
  {
    id: "art",
    label: "r/art",
    subscribers: 21000000,
    description: "Art and inspiration",
  },
  {
    id: "diy",
    label: "r/diy",
    subscribers: 21000000,
    description: "Do it yourself projects",
  },
  {
    id: "travel",
    label: "r/travel",
    subscribers: 9000000,
    description: "Travel advice and photos",
  },
  {
    id: "photography",
    label: "r/photography",
    subscribers: 7000000,
    description: "Photography",
  },
  {
    id: "earthporn",
    label: "r/EarthPorn",
    subscribers: 24000000,
    description: "Beautiful landscapes",
  },
  {
    id: "mildlyinteresting",
    label: "r/mildlyinteresting",
    subscribers: 28000000,
    description: "Mildly interesting things",
  },
  {
    id: "memes",
    label: "r/memes",
    subscribers: 32000000,
    description: "Memes",
  },
  {
    id: "explainlikeimfive",
    label: "r/explainlikeimfive",
    subscribers: 23000000,
    description: "Simple explanations",
  },
  {
    id: "askscience",
    label: "r/askscience",
    subscribers: 24000000,
    description: "Ask science questions",
  },
  {
    id: "wallstreetbets",
    label: "r/wallstreetbets",
    subscribers: 16000000,
    description: "Market chatter",
  },
];

/** Map a subreddit id from our folder pane to a Reddit API path */
function subToPath(sub: string, sort: SortMode): string {
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

function normalizeFeedSubreddit(sub: string): string | null {
  if (sub === "all" || sub === "frontpage" || sub === "popular") {
    return null;
  }

  return sub.toLowerCase().startsWith("r/")
    ? sub.toLowerCase()
    : `r/${sub.toLowerCase()}`;
}

function parseFallbackOffset(after?: string | null): number {
  if (!after?.startsWith(FALLBACK_AFTER_PREFIX)) return 0;

  const offset = Number.parseInt(after.slice(FALLBACK_AFTER_PREFIX.length), 10);
  return Number.isFinite(offset) && offset > 0 ? offset : 0;
}

async function buildFallbackPosts(
  sub: string,
  after: string | null | undefined,
  limit: number,
  sort: SortMode,
  timeRange: TopTimeRange,
): Promise<PostsResponse> {
  const { SAMPLE_POSTS } = await import("./sample-posts");

  const normalizedSub = normalizeFeedSubreddit(sub);
  const filtered = normalizedSub
    ? SAMPLE_POSTS.filter(
        (post) => post.subreddit.toLowerCase() === normalizedSub,
      )
    : SAMPLE_POSTS;

  const basePosts =
    filtered.length > 0
      ? filtered
      : [
          {
            id: 999,
            title: `Welcome to ${normalizedSub ?? "r/all"} (Mock Data)`,
            subreddit: normalizedSub ?? "r/all",
            author: "mock_user",
            time: "1m",
            score: "1",
            comments: 0,
            body: "There are no sample posts for this feed. This is generated mock data so infinite scroll still works when Reddit is unavailable.",
            permalink: `/${normalizedSub ?? "r/all"}/comments/mock`,
          },
        ];

  const rankedPosts =
    sort === "top" && timeRange !== "all"
      ? basePosts.filter((post) => {
          const ageMinutes = parseRelativeAgeMinutes(post.time);
          const windowMinutes = getTopTimeWindowMinutes(timeRange);

          return ageMinutes === null || windowMinutes === null
            ? true
            : ageMinutes <= windowMinutes;
        })
      : basePosts;

  const sortedBase = sortFallbackPosts(
    rankedPosts.length > 0 ? rankedPosts : basePosts,
    sort,
    timeRange,
  );

  const offset = parseFallbackOffset(after);
  const posts = Array.from({ length: Math.max(limit, 1) }, (_, index) => {
    const globalIndex = offset + index;
    const source = sortedBase[globalIndex % sortedBase.length];
    const cycle = Math.floor(globalIndex / sortedBase.length);

    return {
      ...source,
      id: 100000 + globalIndex,
      author: cycle > 0 ? `${source.author}_${cycle}` : source.author,
    };
  });

  return {
    posts,
    after: `${FALLBACK_AFTER_PREFIX}${offset + posts.length}`,
  };
}

function flattenCommentTree(
  comments: RedditComment[] | undefined,
  depth = 0,
): RedditCommentPageItem[] {
  if (!comments?.length) return [];

  return comments.flatMap((comment) => [
    { ...comment, depth },
    ...flattenCommentTree(comment.replies, depth + 1),
  ]);
}

function buildCommentPage(
  comments: RedditCommentPageItem[],
  cursor: number,
  limit: number,
): RedditCommentPage {
  const start = Math.max(0, cursor);
  const end = start + Math.max(1, limit);

  return {
    comments: comments.slice(start, end),
    nextCursor: end < comments.length ? String(end) : null,
  };
}

async function loadCommentTree(
  permalink: string,
): Promise<RedditCommentPageItem[]> {
  const cached = COMMENT_CACHE.get(permalink);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.comments;
  }

  const path = permalink.endsWith("/") ? permalink.slice(0, -1) : permalink;
  const url = `https://www.reddit.com${path}.json?raw_json=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "reddit365/1.0 (Next.js app; educational project)",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.warn(
      `Reddit API error: ${res.status} ${res.statusText}. Falling back to sample comments.`,
    );
    const { SAMPLE_COMMENTS } = await import("./sample-posts");
    const fallbackComments = SAMPLE_COMMENTS[permalink] ?? [
      {
        id: "sample_comment_1",
        author: "reddit_user",
        time: "2h",
        score: "42",
        body: "This is a sample comment because Reddit API returned an error (likely 403 Forbidden).",
        replies: [
          {
            id: "sample_comment_2",
            author: "another_user",
            time: "1h",
            score: "12",
            body: "This is a sample reply.",
          },
        ],
      },
    ];

    const flattenedFallback = flattenCommentTree(fallbackComments);
    COMMENT_CACHE.set(permalink, {
      expiresAt: Date.now() + COMMENT_CACHE_TTL_MS,
      comments: flattenedFallback,
    });
    return flattenedFallback;
  }

  const json = (await res.json()) as unknown;

  if (!Array.isArray(json) || json.length < 2) {
    COMMENT_CACHE.set(permalink, {
      expiresAt: Date.now() + COMMENT_CACHE_TTL_MS,
      comments: [],
    });
    return [];
  }

  const commentsData =
    (json[1] as { data?: { children?: RedditCommentNode[] } } | undefined)?.data
      ?.children ?? [];

  function mapComment(c: RedditCommentNode): RedditComment | null {
    if (c.kind !== "t1") return null;
    const d = c.data;
    if (!d || !d.body) return null;

    let replies: RedditComment[] = [];
    if (typeof d.replies !== "string" && d.replies?.data?.children) {
      replies = d.replies.data.children
        .map(mapComment)
        .filter(Boolean) as RedditComment[];
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

  const flattened = flattenCommentTree(
    commentsData.map(mapComment).filter(Boolean) as RedditComment[],
  );

  COMMENT_CACHE.set(permalink, {
    expiresAt: Date.now() + COMMENT_CACHE_TTL_MS,
    comments: flattened,
  });

  return flattened;
}

/** Fetch posts from Reddit's public JSON API (server-side use) */
export async function fetchRedditPosts(
  sub: string,
  sort: SortMode = "hot",
  after?: string | null,
  limit = 25,
  timeRange: TopTimeRange = "day",
): Promise<PostsResponse> {
  const path = subToPath(sub, sort);
  const params = new URLSearchParams({ limit: String(limit), raw_json: "1" });
  if (after) params.set("after", after);
  if (sort === "top") {
    params.set(
      "t",
      TOP_TIME_RANGE_VALUES.includes(timeRange) ? timeRange : "day",
    );
  }

  const url = `https://www.reddit.com${path}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      // Reddit requires a descriptive User-Agent for API usage
      "User-Agent": "reddit365/1.0 (Next.js app; educational project)",
    },
    next: { revalidate: 60 }, // cache for 60s in Next.js data cache
  });

  if (!res.ok) {
    console.warn(
      `Reddit API error: ${res.status} ${res.statusText}. Falling back to sample posts.`,
    );
    return buildFallbackPosts(sub, after, limit, sort, timeRange);
  }

  const json = (await res.json()) as {
    data?: {
      children?: RedditPostNode[];
      after?: string | null;
    };
  };
  const children = json?.data?.children ?? [];
  const nextAfter: string | null = json?.data?.after ?? null;

  const posts: Post[] = children
    .filter((c) => c.kind === "t3") // text/link posts only
    .map((c, idx: number): Post => {
      const d = c.data;
      const subreddit = `r/${d.subreddit}`;
      // Body: prefer selftext, fall back to url for link posts
      const body: string =
        d.selftext && d.selftext.trim()
          ? d.selftext
          : d.url && !d.url.startsWith("https://www.reddit.com")
            ? `[Link post] ${d.url}`
            : "(No body text)";

      const media = getPostMedia(d);

      return {
        id: idx, // use index as numeric id; full id in name field
        title: d.title,
        subreddit,
        author: d.author,
        time: formatAge(d.created_utc),
        score: formatScore(d.score),
        comments: d.num_comments ?? 0,
        body,
        ...media,
        permalink: d.permalink,
      };
    });

  return { posts, after: nextAfter };
}

export async function fetchRedditSubreddits(
  after?: string | null,
  limit = 25,
): Promise<SubredditResponse> {
  const params = new URLSearchParams({ limit: String(limit), raw_json: "1" });
  if (after) params.set("after", after);

  const url = `https://www.reddit.com/subreddits/popular.json?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "reddit365/1.0 (Next.js app; educational project)",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const start = after ? Number.parseInt(after, 10) : 0;
    const slice = FALLBACK_SUBREDDITS.slice(start, start + limit);
    const nextAfter =
      start + slice.length < FALLBACK_SUBREDDITS.length
        ? String(start + slice.length)
        : null;
    return { subreddits: slice, after: nextAfter };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();
  const children: RedditSubredditNode[] = json?.data?.children ?? [];
  const nextAfter: string | null = json?.data?.after ?? null;

  const subreddits: SubredditListing[] = children
    .filter((c) => c.kind === "t5")
    .map((c): SubredditListing => {
      const d = c.data ?? {};
      const name = String(
        d.display_name ?? d.url?.replace(/^\/r\//, "") ?? "unknown",
      );

      return {
        id: name.toLowerCase(),
        label: `r/${name}`,
        subscribers: d.subscribers ?? 0,
        description: d.public_description || d.title || "Subreddit",
      };
    });

  return { subreddits, after: nextAfter };
}

/** Fetch a paged slice of comments for a specific post permalink */
export async function fetchRedditComments(
  permalink: string,
  options?: { cursor?: number; limit?: number },
): Promise<RedditCommentPage> {
  const comments = await loadCommentTree(permalink);
  const cursor = options?.cursor ?? 0;
  const limit = options?.limit ?? COMMENT_PAGE_SIZE;
  return buildCommentPage(comments, cursor, limit);
}
