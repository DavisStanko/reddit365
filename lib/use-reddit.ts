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
  let basePath: string;
  if (feed === "popular") {
    basePath = "/r/popular";
  } else if (feed === "all") {
    basePath = "/r/all";
  } else {
    const name = feed.replace(/^r\//, "");
    basePath = `/r/${name}`;
  }

  let targetUrl = `https://old.reddit.com${basePath}/${sort}.rss?limit=15`;

  if (sort === "top") {
    targetUrl += "&t=all";
  }
  if (after) {
    targetUrl += `&after=${after}`;
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/reddit`);
  url.searchParams.set("url", targetUrl);

  return url.toString();
}

function buildCommentsUrl(
  permalink: string,
  after: string | null,
): string {
  let targetUrl = permalink;
  if (permalink.startsWith("http")) {
    try {
      const urlObj = new URL(permalink);
      urlObj.host = "old.reddit.com";
      const clean = urlObj.toString().endsWith("/") ? urlObj.toString().slice(0, -1) : urlObj.toString();
      targetUrl = `${clean}.rss?limit=50&sort=confidence`;
    } catch {
      const clean = permalink.endsWith("/") ? permalink.slice(0, -1) : permalink;
      targetUrl = `${clean}.rss?limit=50&sort=confidence`;
    }
  } else {
    const clean = permalink.endsWith("/") ? permalink.slice(0, -1) : permalink;
    targetUrl = `https://old.reddit.com${clean}.rss?limit=50&sort=confidence`;
  }
  if (after) {
    targetUrl += `&after=${after}`;
  }
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/reddit`);
  url.searchParams.set("url", targetUrl);
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
    permalink: typeof d.permalink === "string" && d.permalink.startsWith("/") ? `https://www.reddit.com${d.permalink}` : d.permalink?.replace(/old\.reddit\.com/i, "www.reddit.com"),
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

  useEffect(() => {
    feedRef.current = feed;
    sortRef.current = sort;
    selectedPostRef.current = selectedPost;
  }, [feed, sort, selectedPost]);

  // ------------------------------------------------------------------
  // Effect: fetch posts when feed/sort/timeframe changes
  // ------------------------------------------------------------------
  useEffect(() => {
    const controller = new AbortController();

    const doFetch = async () => {
      // Reset state
      setPosts([]);
      setAfter(null);
      setHasMorePosts(true);
      setPostsError(null);
      afterRef.current = null;

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

        const text = await res.text();
        if (controller.signal.aborted) return;

        let newPosts: Post[] = [];
        let nextAfter: string | null = null;

        if (text.trim().startsWith("<")) {
          // Parse Atom/RSS feed
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/xml");
          const entries = Array.from(doc.querySelectorAll("entry"));
          
          newPosts = entries.map((entry, idx) => {
            const title = entry.querySelector("title")?.textContent || "Untitled";
            const authorName = entry.querySelector("author > name")?.textContent?.replace("/u/", "") || "unknown";
            const link = entry.querySelector("link")?.getAttribute("href") || "";
            const content = entry.querySelector("content")?.textContent || "";
            const updated = entry.querySelector("updated")?.textContent || "";
            const idText = entry.querySelector("id")?.textContent || "";
            
            const matchSub = link.match(/\/r\/([^\/]+)/);
            const subreddit = matchSub ? `r/${matchSub[1]}` : feed;
            
            let imageUrl: string | undefined;
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
            if (imgMatch) {
              imageUrl = imgMatch[1];
            }
            
            const tmp = document.createElement("div");
            tmp.innerHTML = content;

            let externalUrl: string | undefined;
            const linkAnchors = tmp.querySelectorAll("a");
            let linkHref = "";
            let commentsHref = "";
            linkAnchors.forEach((a) => {
              if (a.textContent === "[link]") linkHref = a.getAttribute("href") || "";
              if (a.textContent === "[comments]") commentsHref = a.getAttribute("href") || "";
            });
            if (linkHref && commentsHref && linkHref !== commentsHref) {
              externalUrl = linkHref;
            }

            let bodyText = tmp.textContent || tmp.innerText || "";
            bodyText = bodyText.replace(/submitted by\s+\/?u\/[^\s]+(\s+to\s+\/?r\/[^\s]+)?(\s+\[link\])?(\s+\[comments\])?/gi, "").trim();
            bodyText = bodyText.replace(/\[link\]\s+\[comments\]/gi, "").trim();
            
            return {
              id: idText ? parseInt(idText.replace(/[^0-9]/g, "").slice(0, 8), 10) || Math.floor(Math.random() * 1e8) : Math.floor(Math.random() * 1e8),
              title,
              subreddit,
              author: authorName,
              time: updated ? new Date(updated).toLocaleDateString() : "recent",
              score: "0",
              comments: 0,
              body: bodyText.length > 200 ? bodyText.slice(0, 200) + "..." : bodyText,
              imageUrl,
              permalink: link.replace(/old\.reddit\.com/i, "www.reddit.com"),
              externalUrl: externalUrl ? externalUrl.replace(/old\.reddit\.com/i, "www.reddit.com") : undefined,
            };
          });
        } else {
          const json = JSON.parse(text);
          const children = json?.data?.children ?? [];
          nextAfter = json?.data?.after ?? null;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          newPosts = children
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((c: any) => c.kind === "t3")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((c: any) => parsePost(c.data));
        }

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

    if (!selectedPost?.permalink) return;

    const permalink = selectedPost.permalink;

    const doFetch = async () => {
      // Reset comments
      setComments([]);
      setCommentsAfter(null);
      setHasMoreComments(true);
      setCommentsError(null);
      commentsAfterRef.current = null;

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

        const text = await res.text();
        if (controller.signal.aborted) return;

        let newComments: FlatComment[] = [];

        if (text.trim().startsWith("<")) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/xml");
          const entries = Array.from(doc.querySelectorAll("entry"));
          // In Reddit's comment RSS feed, the first <entry> is ALWAYS the post itself.
          // We slice(1) to drop the post and only map the actual comments.
          newComments = entries.slice(1).map((entry) => {
            const authorName = entry.querySelector("author > name")?.textContent?.replace("/u/", "") || "unknown";
            const content = entry.querySelector("content")?.textContent || "";
            const updated = entry.querySelector("updated")?.textContent || "";
            const idText = entry.querySelector("id")?.textContent || String(Math.random());
            
            const tmp = document.createElement("div");
            tmp.innerHTML = content;
            const bodyText = tmp.textContent || tmp.innerText || "";
            
            return {
              id: idText,
              author: authorName,
              time: updated ? new Date(updated).toLocaleDateString() : "recent",
              score: "0",
              body: bodyText,
              depth: 0,
            };
          });
          
          commentsAfterRef.current = null;
          setCommentsAfter(null);
          setHasMoreComments(false);
          setComments(newComments);
        } else {
          setComments([]);
          setHasMoreComments(false);
        }
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

        const text = await res.text();
        if (controller.signal.aborted) return;

        let newPosts: Post[] = [];
        let nextAfter: string | null = null;

        if (text.trim().startsWith("<")) {
          // Parse Atom/RSS feed
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/xml");
          const entries = Array.from(doc.querySelectorAll("entry"));
          
          newPosts = entries.map((entry) => {
            const title = entry.querySelector("title")?.textContent || "Untitled";
            const authorName = entry.querySelector("author > name")?.textContent?.replace("/u/", "") || "unknown";
            const link = entry.querySelector("link")?.getAttribute("href") || "";
            const content = entry.querySelector("content")?.textContent || "";
            const updated = entry.querySelector("updated")?.textContent || "";
            const idText = entry.querySelector("id")?.textContent || "";
            
            const matchSub = link.match(/\/r\/([^\/]+)/);
            const subreddit = matchSub ? `r/${matchSub[1]}` : feedRef.current;
            
            let imageUrl: string | undefined;
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
            if (imgMatch) {
              imageUrl = imgMatch[1];
            }
            
            const tmp = document.createElement("div");
            tmp.innerHTML = content;

            let externalUrl: string | undefined;
            const linkAnchors = tmp.querySelectorAll("a");
            let linkHref = "";
            let commentsHref = "";
            linkAnchors.forEach((a) => {
              if (a.textContent === "[link]") linkHref = a.getAttribute("href") || "";
              if (a.textContent === "[comments]") commentsHref = a.getAttribute("href") || "";
            });
            if (linkHref && commentsHref && linkHref !== commentsHref) {
              externalUrl = linkHref;
            }

            let bodyText = tmp.textContent || tmp.innerText || "";
            bodyText = bodyText.replace(/submitted by\s+\/?u\/[^\s]+(\s+to\s+\/?r\/[^\s]+)?(\s+\[link\])?(\s+\[comments\])?/gi, "").trim();
            bodyText = bodyText.replace(/\[link\]\s+\[comments\]/gi, "").trim();
            
            return {
              id: idText ? parseInt(idText.replace(/[^0-9]/g, "").slice(0, 8), 10) || Math.floor(Math.random() * 1e8) : Math.floor(Math.random() * 1e8),
              title,
              subreddit,
              author: authorName,
              time: updated ? new Date(updated).toLocaleDateString() : "recent",
              score: "0",
              comments: 0,
              body: bodyText.length > 200 ? bodyText.slice(0, 200) + "..." : bodyText,
              imageUrl,
              permalink: link.replace(/old\.reddit\.com/i, "www.reddit.com"),
              externalUrl: externalUrl ? externalUrl.replace(/old\.reddit\.com/i, "www.reddit.com") : undefined,
            };
          });
          nextAfter = null;
        } else {
          const json = JSON.parse(text);
          const children = json?.data?.children ?? [];
          nextAfter = json?.data?.after ?? null;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          newPosts = children
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((c: any) => c.kind === "t3")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((c: any) => parsePost(c.data));
        }

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

