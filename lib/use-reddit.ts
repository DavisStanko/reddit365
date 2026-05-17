"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Post, FlatComment, RedditComment } from "./types";

function flattenRedditComments(comments: RedditComment[], depth = 0): FlatComment[] {
  return comments.flatMap((c) => {
    const flat: FlatComment = {
      id: c.id,
      author: c.author,
      time: c.time,
      score: c.score,
      body: c.body,
      depth,
    };
    return [flat, ...flattenRedditComments(c.replies || [], depth + 1)];
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortMode = "hot" | "new" | "top";
export interface RedditState {
  posts: Post[];
  after: string | null;
  isLoadingPosts: boolean;
  hasMorePosts: boolean;
  postsError: string | null;

  comments: FlatComment[];
  commentsAfter: string | null;
  isLoadingComments: boolean;
  hasMoreComments: boolean;
  commentsError: string | null;
}

export interface UseRedditReturn extends RedditState {
  loadMorePosts: () => void;
  loadMoreComments: () => void;
  refreshPosts: () => void;
}

// ---------------------------------------------------------------------------
// Helpers — URL building
// ---------------------------------------------------------------------------

function buildPostsUrl(
  feed: string,
  sort: SortMode,
  after: string | null,
): string {
  // "frontpage" is a virtual feed — use r/popular as placeholder
  const isVirtualFrontpage = feed === "frontpage";
  const effectiveFeed = isVirtualFrontpage ? "popular" : feed;

  let basePath: string;
  if (effectiveFeed === "popular") {
    basePath = "/r/popular";
  } else if (effectiveFeed === "all") {
    basePath = "/r/all";
  } else {
    const name = effectiveFeed.replace(/^r\//, "");
    basePath = `/r/${name}`;
  }

  // Sort is part of URL path: /r/sub/hot.json, /r/sub/new.json, etc.
  const url = new URL(`https://www.reddit.com${basePath}/${sort}.json`);
  url.searchParams.set("raw_json", "1");
  url.searchParams.set("limit", "10");

  if (sort === "top") {
    url.searchParams.set("t", "all");
  }
  if (after) {
    url.searchParams.set("after", after);
  }

  return url.toString();
}

function buildCommentsUrl(
  permalink: string,
  after: string | null,
): string {
  // permalink looks like /r/subreddit/comments/abc123/slug/
  const clean = permalink.endsWith("/") ? permalink.slice(0, -1) : permalink;
  const url = new URL(`https://www.reddit.com${clean}.json`);
  url.searchParams.set("raw_json", "1");
  url.searchParams.set("limit", "50");
  url.searchParams.set("sort", "confidence");
  if (after) {
    url.searchParams.set("after", after);
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Helpers — Parsing
// ---------------------------------------------------------------------------

function unescapeHtmlEntities(str: string): string {
  return str.replace(/&amp;/g, "&");
}

function formatAge(createdUtc: number): string {
  const diffMs = Date.now() - createdUtc * 1000;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return String(score);
}

function looksLikeImage(url?: string): boolean {
  return !!url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePost(d: any): Post {
  const subreddit = `r/${d.subreddit}`;

  const body: string =
    d.selftext?.trim()
      ? d.selftext
      : d.url && !d.url.startsWith("https://www.reddit.com")
        ? `[Link post] ${d.url}`
        : "";

  // --- Media extraction ---
  let imageUrl: string | undefined;
  let mediaUrl: string | undefined;
  let mediaType: "image" | "video" | undefined;

  const directUrl = d.url_overridden_by_dest || d.url;

  if (d.is_video) {
    const videoUrl =
      d.secure_media?.reddit_video?.fallback_url ||
      d.media?.reddit_video?.fallback_url;
    if (videoUrl) {
      mediaUrl = videoUrl;
      mediaType = "video";
    }
  } else if (d.is_gallery) {
    const firstId = d.gallery_data?.items?.[0]?.media_id;
    const galleryUrl = firstId && d.media_metadata?.[firstId]?.s?.u;
    if (galleryUrl) {
      const url = unescapeHtmlEntities(galleryUrl);
      imageUrl = url;
      mediaUrl = url;
      mediaType = "image";
    }
  } else if (looksLikeImage(directUrl)) {
    imageUrl = directUrl;
    mediaUrl = directUrl;
    mediaType = "image";
  } else if (d.preview?.images?.[0]?.source?.url) {
    const url = unescapeHtmlEntities(d.preview.images[0].source.url);
    imageUrl = url;
    mediaUrl = url;
    mediaType = "image";
  }

  // --- Score ---
  const scoreStr =
    d.score !== undefined ? formatScore(d.score) : "0";

  // --- Time ---
  const timeStr = d.created_utc ? formatAge(d.created_utc) : "0m";

  return {
    id: d.name
      ? parseInt(d.name.replace(/^t3_/, ""), 36)
      : Math.floor(Math.random() * 1e8),
    title: d.title || "Untitled",
    subreddit,
    author: d.author || "unknown",
    time: timeStr,
    score: scoreStr,
    comments: d.num_comments || 0,
    body,
    imageUrl,
    mediaUrl,
    mediaType,
    permalink: d.permalink,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCommentNode(node: any, depth: number): FlatComment[] {
  if (node.kind !== "t1") return [];
  const d = node.data;
  if (!d || !d.body) return [];

  const comment: FlatComment = {
    id: d.id ?? d.name ?? String(Math.random()),
    author: d.author ?? "unknown",
    time: d.created_utc ? formatAge(d.created_utc) : "0m",
    score: d.score !== undefined ? formatScore(d.score) : "0",
    body: d.body,
    depth,
  };

  let childComments: FlatComment[] = [];
  if (typeof d.replies !== "string" && d.replies?.data?.children) {
    childComments = d.replies.data.children.flatMap(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child: any) => parseCommentNode(child, depth + 1),
    );
  }

  return [comment, ...childComments];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReddit(
  feed: string,
  sort: SortMode,
  selectedPost: Post | null,
): UseRedditReturn {
  // ---- Posts state ----
  const [posts, setPosts] = useState<Post[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  // ---- Comments state ----
  const [comments, setComments] = useState<FlatComment[]>([]);
  const [commentsAfter, setCommentsAfter] = useState<string | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // ---- Refs to avoid stale closures ----
  const afterRef = useRef<string | null>(null);
  const loadingPostsRef = useRef(false);
  const commentsAfterRef = useRef<string | null>(null);
  const loadingCommentsRef = useRef(false);

  // Stable refs for current params (used by loadMore callbacks)
  const feedRef = useRef(feed);
  const sortRef = useRef(sort);
  const selectedPostRef = useRef(selectedPost);

  feedRef.current = feed;
  sortRef.current = sort;
  selectedPostRef.current = selectedPost;

  // ------------------------------------------------------------------
  // Effect: fetch posts when feed/sort/timeframe changes
  // ------------------------------------------------------------------
  useEffect(() => {
    const controller = new AbortController();

    // Reset state
    setPosts([]);
    setAfter(null);
    setHasMorePosts(true);
    setPostsError(null);
    afterRef.current = null;
    loadingPostsRef.current = false;

    const doFetch = async () => {
      loadingPostsRef.current = true;
      setIsLoadingPosts(true);
      setPostsError(null);

      try {
        const url = buildPostsUrl(feed, sort, null);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "No response body");
          throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const json = await res.json();
        if (controller.signal.aborted) return;

        const children = json?.data?.children ?? [];
        const nextAfter: string | null = json?.data?.after ?? null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newPosts: Post[] = children
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => c.kind === "t3")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => parsePost(c.data));

        afterRef.current = nextAfter;
        setAfter(nextAfter);
        setHasMorePosts(nextAfter !== null);
        setPosts(newPosts);
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.warn("[useReddit] posts fetch failed:", err);
        setPostsError(err instanceof Error ? err.message : String(err));
        setHasMorePosts(false);
      } finally {
        if (!controller.signal.aborted) {
          loadingPostsRef.current = false;
          setIsLoadingPosts(false);
        }
      }
    };

    void doFetch();

    return () => {
      controller.abort();
      loadingPostsRef.current = false;
    };
  }, [feed, sort]);

  // ------------------------------------------------------------------
  // Effect: fetch comments when selectedPost changes
  // ------------------------------------------------------------------
  useEffect(() => {
    const controller = new AbortController();

    // Reset comments
    setComments([]);
    setCommentsAfter(null);
    setHasMoreComments(true);
    setCommentsError(null);
    commentsAfterRef.current = null;
    loadingCommentsRef.current = false;

    if (!selectedPost?.permalink) return;

    const permalink = selectedPost.permalink;

    const doFetch = async () => {
      loadingCommentsRef.current = true;
      setIsLoadingComments(true);
      setCommentsError(null);

      try {
        const url = buildCommentsUrl(permalink, null);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "No response body");
          throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const json = await res.json();
        if (controller.signal.aborted) return;

        if (!Array.isArray(json) || json.length < 2) {
          setComments([]);
          setHasMoreComments(false);
          return;
        }

        const commentListing = json[1];
        const children = commentListing?.data?.children ?? [];
        const nextAfter: string | null = commentListing?.data?.after ?? null;

        const newComments: FlatComment[] = children.flatMap(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => parseCommentNode(c, 0),
        );

        commentsAfterRef.current = nextAfter;
        setCommentsAfter(nextAfter);
        setHasMoreComments(nextAfter !== null);
        setComments(newComments);
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.warn("[useReddit] comments fetch failed:", err);
        setCommentsError(err instanceof Error ? err.message : String(err));
        setHasMoreComments(false);
      } finally {
        if (!controller.signal.aborted) {
          loadingCommentsRef.current = false;
          setIsLoadingComments(false);
        }
      }
    };

    void doFetch();

    return () => {
      controller.abort();
      loadingCommentsRef.current = false;
    };
  }, [selectedPost?.id, selectedPost?.permalink]);

  // ------------------------------------------------------------------
  // loadMorePosts — append next page
  // ------------------------------------------------------------------
  const loadMorePosts = useCallback(() => {
    if (loadingPostsRef.current || !afterRef.current) return;

    const currentAfter = afterRef.current;
    loadingPostsRef.current = true;
    setIsLoadingPosts(true);

    const controller = new AbortController();

    const doFetch = async () => {
      try {
        const url = buildPostsUrl(
          feedRef.current,
          sortRef.current,
          currentAfter,
        );
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "No response body");
          throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const json = await res.json();
        if (controller.signal.aborted) return;

        const children = json?.data?.children ?? [];
        const nextAfter: string | null = json?.data?.after ?? null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newPosts: Post[] = children
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => c.kind === "t3")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => parsePost(c.data));

        afterRef.current = nextAfter;
        setAfter(nextAfter);
        setHasMorePosts(nextAfter !== null);

        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const unique = newPosts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...unique];
        });
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.warn("[useReddit] load more posts blocked/failed:", err);
        setHasMorePosts(false);
      } finally {
        if (!controller.signal.aborted) {
          loadingPostsRef.current = false;
          setIsLoadingPosts(false);
        }
      }
    };

    void doFetch();
  }, []);

  // ------------------------------------------------------------------
  // loadMoreComments — append next page
  // ------------------------------------------------------------------
  const loadMoreComments = useCallback(() => {
    if (loadingCommentsRef.current || !commentsAfterRef.current) return;
    const permalink = selectedPostRef.current?.permalink;
    if (!permalink) return;

    const currentAfter = commentsAfterRef.current;
    loadingCommentsRef.current = true;
    setIsLoadingComments(true);

    const controller = new AbortController();

    const doFetch = async () => {
      try {
        const url = buildCommentsUrl(permalink, currentAfter);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "No response body");
          throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const json = await res.json();
        if (controller.signal.aborted) return;

        if (!Array.isArray(json) || json.length < 2) {
          setHasMoreComments(false);
          commentsAfterRef.current = null;
          setCommentsAfter(null);
          return;
        }

        const commentListing = json[1];
        const children = commentListing?.data?.children ?? [];
        const nextAfter: string | null = commentListing?.data?.after ?? null;

        const newComments: FlatComment[] = children.flatMap(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => parseCommentNode(c, 0),
        );

        commentsAfterRef.current = nextAfter;
        setCommentsAfter(nextAfter);
        setHasMoreComments(nextAfter !== null);

        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const unique = newComments.filter((c) => !existingIds.has(c.id));
          return [...prev, ...unique];
        });
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.warn("[useReddit] load more comments blocked/failed:", err);
        setHasMoreComments(false);
      } finally {
        if (!controller.signal.aborted) {
          loadingCommentsRef.current = false;
          setIsLoadingComments(false);
        }
      }
    };

    void doFetch();
  }, []);

  // ------------------------------------------------------------------
  // refreshPosts — force re-fetch from page 1
  // ------------------------------------------------------------------
  const refreshPosts = useCallback(() => {
    // Reset state and re-trigger the effect by... we can't retrigger easily.
    // Instead, directly fetch.
    setPosts([]);
    setAfter(null);
    setHasMorePosts(true);
    setPostsError(null);
    afterRef.current = null;
    loadingPostsRef.current = false;

    const controller = new AbortController();
    setIsLoadingPosts(true);

    const doFetch = async () => {
      try {
        const url = buildPostsUrl(
          feedRef.current,
          sortRef.current,
          null,
        );
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => "No response body");
          throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const json = await res.json();
        if (controller.signal.aborted) return;

        const children = json?.data?.children ?? [];
        const nextAfter: string | null = json?.data?.after ?? null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newPosts: Post[] = children
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => c.kind === "t3")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => parsePost(c.data));

        afterRef.current = nextAfter;
        setAfter(nextAfter);
        setHasMorePosts(nextAfter !== null);
        setPosts(newPosts);
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.warn("[useReddit] refresh failed:", err);
        setPostsError(err instanceof Error ? err.message : String(err));
        setHasMorePosts(false);
      } finally {
        if (!controller.signal.aborted) {
          loadingPostsRef.current = false;
          setIsLoadingPosts(false);
        }
      }
    };

    void doFetch();
  }, []);

  return {
    posts,
    after,
    isLoadingPosts,
    hasMorePosts,
    postsError,

    comments,
    commentsAfter,
    isLoadingComments,
    hasMoreComments,
    commentsError,

    loadMorePosts,
    loadMoreComments,
    refreshPosts,
  };
}

