"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Post, FlatComment } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortMode = "hot" | "new" | "top";

export interface RetryInfo {
  /** Which retry we are on (1-based: 1 means first retry after initial failure). */
  attempt: number;
  /** Seconds we are waiting before this retry fires. */
  retryInSeconds: number;
}

interface RedditState {
  posts: Post[];
  after: string | null;
  isLoadingPosts: boolean;
  hasMorePosts: boolean;
  postsError: string | null;
  postsRetryInfo: RetryInfo | null;

  comments: FlatComment[];
  commentsAfter: string | null;
  isLoadingComments: boolean;
  hasMoreComments: boolean;
  commentsError: string | null;
  commentsRetryInfo: RetryInfo | null;
}

export interface UseRedditReturn extends RedditState {
  loadMorePosts: () => void;
  loadMoreComments: () => void;
  refreshPosts: () => void;
  refreshComments: () => void;
}

// ---------------------------------------------------------------------------
// Helpers — URL building
// ---------------------------------------------------------------------------

// Fetch the maximum posts per request to minimise total Reddit API calls.
// Reddit's RSS hard cap is 100.
const PAGE_SIZE = 100;

function buildPostsUrl(
  feed: string,
  sort: SortMode,
  after: string | null,
  forceRefresh: boolean = false,
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

  let targetUrl = `https://old.reddit.com${basePath}/${sort}.rss?limit=${PAGE_SIZE}`;

  if (sort === "top") {
    targetUrl += "&t=all";
  }
  if (after) {
    targetUrl += `&after=${after}`;
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/reddit`);
  url.searchParams.set("url", targetUrl);
  if (forceRefresh) {
    url.searchParams.set("forceRefresh", "true");
  }
  return url.toString();
}

function buildCommentsUrl(permalink: string, after: string | null, forceRefresh: boolean = false): string {
  let targetUrl = permalink;
  if (permalink.startsWith("http")) {
    try {
      const urlObj = new URL(permalink);
      urlObj.host = "old.reddit.com";
      const clean = urlObj.toString().endsWith("/")
        ? urlObj.toString().slice(0, -1)
        : urlObj.toString();
      targetUrl = `${clean}.rss?limit=50&sort=confidence`;
    } catch {
      const clean = permalink.endsWith("/")
        ? permalink.slice(0, -1)
        : permalink;
      targetUrl = `${clean}.rss?limit=50&sort=confidence`;
    }
  } else {
    const clean = permalink.endsWith("/") ? permalink.slice(0, -1) : permalink;
    targetUrl = `https://old.reddit.com${clean}.rss?limit=50&sort=confidence`;
  }
  if (after) targetUrl += `&after=${after}`;

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/reddit`);
  url.searchParams.set("url", targetUrl);
  if (forceRefresh) {
    url.searchParams.set("forceRefresh", "true");
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Helpers — fetch with 429 retry + backoff
// ---------------------------------------------------------------------------

/**
 * Fetch a URL, automatically retrying on HTTP 429 (rate limited).
 * Implements exponential backoff and respects the Retry-After header if present.
 *
 * @param onRetry  Called just before each retry with the current retry status.
 *                 Use this to update UI (e.g. "Attempt 1/3, retrying in 5s").
 */
async function fetchWithRetry(
  url: string,
  signal: AbortSignal,
  baseDelayMs = 4000,
  onRetry?: (info: RetryInfo) => void,
): Promise<Response> {
  let attempt = 0;
  const MAX_ATTEMPTS = 5;

  while (true) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const res = await fetch(url, { signal });
    if (res.status !== 429) return res;           // success or non-429 error

    attempt++;
    if (attempt > MAX_ATTEMPTS) {
      console.warn(`[useReddit] Max retries (${MAX_ATTEMPTS}) reached for 429. Giving up.`);
      return res;
    }

    let waitMs = baseDelayMs * Math.pow(2, attempt - 1);

    const retryAfterHeader = res.headers.get("Retry-After");
    if (retryAfterHeader) {
      const retryAfterSec = parseInt(retryAfterHeader, 10);
      if (!isNaN(retryAfterSec)) {
        waitMs = retryAfterSec * 1000;
      }
    }

    // Cap backoff at 1 minute if no explicit Retry-After header was provided
    if (!retryAfterHeader && waitMs > 60000) {
      waitMs = 60000;
    }

    // Start countdown one second less than total wait so it shows 3... 2... 1... 0
    let remainingSeconds = Math.max(0, Math.round(waitMs / 1000) - 1);
    const info: RetryInfo = {
      attempt,
      retryInSeconds: remainingSeconds,
    };

    console.warn(
      `[useReddit] 429 — retrying in ${remainingSeconds + 1}s (attempt ${info.attempt}/${MAX_ATTEMPTS})`,
    );
    onRetry?.(info);

    await new Promise<void>((resolve, reject) => {
      let interval: ReturnType<typeof setInterval>;

      const tick = () => {
        remainingSeconds--;
        if (remainingSeconds < 0) {
          clearInterval(interval);
          resolve();
        } else {
          onRetry?.({ ...info, retryInSeconds: remainingSeconds });
        }
      };

      interval = setInterval(tick, 1000);

      signal.addEventListener(
        "abort",
        () => {
          clearInterval(interval);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers — Parsing
// ---------------------------------------------------------------------------

/**
 * Parse an Atom/RSS post feed returned by old.reddit.com.
 * Returns parsed posts and the `after` cursor for the next page
 * (a Reddit fullname like `t3_xxxxxx`), or null if at the end of the feed.
 */
function parsePostFeed(
  text: string,
  fallbackFeed: string,
): { posts: Post[]; nextAfter: string | null } {
  if (!text.trim().startsWith("<")) {
    return { posts: [], nextAfter: null };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");

  const feedTitle = doc.querySelector("title")?.textContent;
  if (feedTitle && feedTitle.includes("page not found")) {
    const name = fallbackFeed.replace(/^r\//, "");
    throw new Error(`The subreddit "r/${name}" does not exist or is private.`);
  }

  const entries = Array.from(doc.querySelectorAll("entry"));

  const posts: Post[] = entries.map((entry) => {
    const title = entry.querySelector("title")?.textContent || "Untitled";
    const authorName =
      entry.querySelector("author > name")?.textContent?.replace("/u/", "") ||
      "unknown";
    const link = entry.querySelector("link")?.getAttribute("href") || "";
    const content = entry.querySelector("content")?.textContent || "";
    const updated = entry.querySelector("updated")?.textContent || "";
    const idText = entry.querySelector("id")?.textContent || "";

    const matchSub = link.match(/\/r\/([^\/]+)/);
    const subreddit = matchSub ? `r/${matchSub[1]}` : fallbackFeed;

    let imageUrl: string | undefined;
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch) imageUrl = imgMatch[1];

    const tmp = document.createElement("div");
    tmp.innerHTML = content;

    let externalUrl: string | undefined;
    const linkAnchors = tmp.querySelectorAll("a");
    let linkHref = "";
    let commentsHref = "";
    linkAnchors.forEach((a) => {
      if (a.textContent === "[link]") linkHref = a.getAttribute("href") || "";
      if (a.textContent === "[comments]")
        commentsHref = a.getAttribute("href") || "";
    });
    if (linkHref && commentsHref && linkHref !== commentsHref)
      externalUrl = linkHref;

    let isGallery = false;
    if (externalUrl) {
      const isRedditImage = externalUrl.includes("i.redd.it");
      const isOtherImage = externalUrl.endsWith(".jpg") || externalUrl.endsWith(".jpeg") || externalUrl.endsWith(".png") || externalUrl.endsWith(".gif");
      
      if (isRedditImage || isOtherImage) {
        console.log("[useReddit] Converting external link to image:", externalUrl);
        imageUrl = externalUrl;
        externalUrl = undefined;
      } else if (externalUrl.includes("/gallery/")) {
        isGallery = true;
        if (imageUrl && imageUrl.includes("preview.redd.it")) {
          imageUrl = imageUrl.split("?")[0].replace("preview.redd.it", "i.redd.it");
        }
      }
    }

    let bodyText = tmp.textContent || tmp.innerText || "";
    bodyText = bodyText
      .replace(
        /submitted by\s+\/?u\/[^\s]+(\s+to\s+\/?r\/[^\s]+)?(\s+\[link\])?(\s+\[comments\])?/gi,
        "",
      )
      .trim();
    bodyText = bodyText.replace(/\[link\]\s+\[comments\]/gi, "").trim();

    const numericId = idText
      ? parseInt(idText.replace(/^t3_/, ""), 36) ||
      Math.floor(Math.random() * 1e8)
      : Math.floor(Math.random() * 1e8);

    return {
      id: numericId,
      title,
      subreddit,
      author: authorName,
      time: updated ? new Date(updated).toLocaleDateString() : "recent",
      score: "0",
      comments: 0,
      body: bodyText,
      imageUrl,
      permalink: link.replace(/old\.reddit\.com/i, "www.reddit.com"),
      externalUrl: externalUrl
        ? externalUrl.replace(/old\.reddit\.com/i, "www.reddit.com")
        : undefined,
      isGallery,
    };
  });

  // Build the `after` cursor from the last entry's Reddit fullname.
  // Only set when we got a full page — fewer entries means end of feed.
  let nextAfter: string | null = null;
  if (entries.length >= PAGE_SIZE) {
    const lastEntry = entries[entries.length - 1];
    const rawId = lastEntry.querySelector("id")?.textContent || "";
    if (rawId.startsWith("t3_")) {
      nextAfter = rawId.trim();
    } else {
      const m = rawId.match(/\/comments\/([a-z0-9]+)\//i);
      if (m) nextAfter = `t3_${m[1]}`;
    }
  }

  return { posts, nextAfter };
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
  const [postsRetryInfo, setPostsRetryInfo] = useState<RetryInfo | null>(null);

  // Synchronously reset posts when feed or sort changes to avoid stale data
  const [prevFeed, setPrevFeed] = useState(feed);
  const [prevSort, setPrevSort] = useState(sort);

  if (feed !== prevFeed || sort !== prevSort) {
    setPrevFeed(feed);
    setPrevSort(sort);
    setPosts([]);
    setAfter(null);
    setHasMorePosts(true);
    setPostsError(null);
    setPostsRetryInfo(null);
    setIsLoadingPosts(true);
  }

  // ---- Comments state ----
  const [comments, setComments] = useState<FlatComment[]>([]);
  const [commentsAfter, setCommentsAfter] = useState<string | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsRetryInfo, setCommentsRetryInfo] = useState<RetryInfo | null>(null);

  // ---- Refs to avoid stale closures ----
  const afterRef = useRef<string | null>(null);
  const loadingPostsRef = useRef(false);
  const commentsAfterRef = useRef<string | null>(null);
  const loadingCommentsRef = useRef(false);

  const feedRef = useRef(feed);
  const sortRef = useRef(sort);
  const selectedPostRef = useRef(selectedPost);

  useEffect(() => {
    feedRef.current = feed;
    sortRef.current = sort;
    selectedPostRef.current = selectedPost;
  }, [feed, sort, selectedPost]);

  // ------------------------------------------------------------------
  // Effect: fetch posts when feed/sort changes
  // ------------------------------------------------------------------
  useEffect(() => {
    const controller = new AbortController();

    const doFetch = async () => {
      setPosts([]);
      setAfter(null);
      setHasMorePosts(true);
      setPostsError(null);
      setPostsRetryInfo(null);
      afterRef.current = null;
      loadingPostsRef.current = true;
      setIsLoadingPosts(true);

      try {
        const url = buildPostsUrl(feed, sort, null);
        const res = await fetchWithRetry(
          url,
          controller.signal,
          4000,
          (info) => setPostsRetryInfo(info),
        );
        setPostsRetryInfo(null);

        if (!res.ok) {
          const text = await res.text().catch(() => "No response body");
          if ((res.status === 404 && text.includes("page not found")) ||
            (res.status === 403 && text.includes(": private"))) {
            const name = feed.replace(/^r\//, "");
            throw new Error(`The subreddit "r/${name}" does not exist or is private.`);
          }
          throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const text = await res.text();
        if (controller.signal.aborted) return;

        const { posts: newPosts, nextAfter } = parsePostFeed(text, feed);

        afterRef.current = nextAfter;
        setAfter(nextAfter);
        setHasMorePosts(nextAfter !== null);
        setPosts(newPosts);
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.warn("[useReddit] posts fetch failed:", err);
        setPostsError(err instanceof Error ? err.message : String(err));
        setPostsRetryInfo(null);
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
      setComments([]);
      setCommentsAfter(null);
      setHasMoreComments(true);
      setCommentsError(null);
      setCommentsRetryInfo(null);
      commentsAfterRef.current = null;
      loadingCommentsRef.current = true;
      setIsLoadingComments(true);

      try {
        const url = buildCommentsUrl(permalink, null);
        const res = await fetchWithRetry(
          url,
          controller.signal,
          4000,
          (info) => setCommentsRetryInfo(info),
        );
        setCommentsRetryInfo(null);

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
          // The first <entry> in Reddit's comment RSS is always the post itself — skip it.
          newComments = entries.slice(1).map((entry) => {
            const authorName =
              entry
                .querySelector("author > name")
                ?.textContent?.replace("/u/", "") || "unknown";
            const content = entry.querySelector("content")?.textContent || "";
            const updated =
              entry.querySelector("updated")?.textContent || "";
            const idText =
              entry.querySelector("id")?.textContent || String(Math.random());

            const tmp = document.createElement("div");
            tmp.innerHTML = content;
            const bodyText = tmp.textContent || tmp.innerText || "";

            return {
              id: idText,
              author: authorName,
              time: updated
                ? new Date(updated).toLocaleDateString()
                : "recent",
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
        setCommentsRetryInfo(null);
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
  // loadMorePosts — append next page on scroll
  // ------------------------------------------------------------------
  const loadMorePosts = useCallback(() => {
    if (loadingPostsRef.current || !afterRef.current) return;

    const currentAfter = afterRef.current;
    loadingPostsRef.current = true;
    setIsLoadingPosts(true);
    setPostsRetryInfo(null);

    const controller = new AbortController();

    const doFetch = async () => {
      try {
        const url = buildPostsUrl(
          feedRef.current,
          sortRef.current,
          currentAfter,
        );
        const res = await fetchWithRetry(
          url,
          controller.signal,
          4000,
          (info) => setPostsRetryInfo(info),
        );
        setPostsRetryInfo(null);

        if (!res.ok) {
          const text = await res.text().catch(() => "No response body");
          if ((res.status === 404 && text.includes("page not found")) ||
            (res.status === 403 && text.includes(": private"))) {
            const name = feedRef.current.replace(/^r\//, "");
            throw new Error(`The subreddit "r/${name}" does not exist or is private.`);
          }
          throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const text = await res.text();
        if (controller.signal.aborted) return;

        const { posts: newPosts, nextAfter } = parsePostFeed(
          text,
          feedRef.current,
        );

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
        console.warn("[useReddit] load more posts failed:", err);
        setPostsRetryInfo(null);
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
  // loadMoreComments — not supported by Reddit RSS
  // ------------------------------------------------------------------
  const loadMoreComments = useCallback(() => {
    // Comment pagination is not supported via RSS — one request per post.
  }, []);

  // ------------------------------------------------------------------
  // refreshPosts — force re-fetch from page 1
  // ------------------------------------------------------------------
  const refreshPosts = useCallback(() => {
    setPosts([]);
    setAfter(null);
    setHasMorePosts(true);
    setPostsError(null);
    setPostsRetryInfo(null);
    afterRef.current = null;
    loadingPostsRef.current = false;

    const controller = new AbortController();
    setIsLoadingPosts(true);

    const doFetch = async () => {
      try {
        const url = buildPostsUrl(feedRef.current, sortRef.current, null, true);
        const res = await fetchWithRetry(
          url,
          controller.signal,
          4000,
          (info) => setPostsRetryInfo(info),
        );
        setPostsRetryInfo(null);

        if (!res.ok) {
          const text = await res.text().catch(() => "No response body");
          if ((res.status === 404 && text.includes("page not found")) ||
            (res.status === 403 && text.includes(": private"))) {
            const name = feedRef.current.replace(/^r\//, "");
            throw new Error(`The subreddit "r/${name}" does not exist or is private.`);
          }
          throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const text = await res.text();
        if (controller.signal.aborted) return;

        const { posts: newPosts, nextAfter } = parsePostFeed(
          text,
          feedRef.current,
        );

        afterRef.current = nextAfter;
        setAfter(nextAfter);
        setHasMorePosts(nextAfter !== null);
        setPosts(newPosts);
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.warn("[useReddit] refresh failed:", err);
        setPostsError(err instanceof Error ? err.message : String(err));
        setPostsRetryInfo(null);
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
  // refreshComments — force re-fetch of comments
  // ------------------------------------------------------------------
  const refreshComments = useCallback(() => {
    if (!selectedPostRef.current?.permalink) return;

    setComments([]);
    setCommentsAfter(null);
    setHasMoreComments(true);
    setCommentsError(null);
    setCommentsRetryInfo(null);
    commentsAfterRef.current = null;
    loadingCommentsRef.current = true;

    const controller = new AbortController();
    setIsLoadingComments(true);

    const doFetch = async () => {
      try {
        const url = buildCommentsUrl(selectedPostRef.current!.permalink, null, true);
        const res = await fetchWithRetry(
          url,
          controller.signal,
          4000,
          (info) => setCommentsRetryInfo(info),
        );
        setCommentsRetryInfo(null);

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
          newComments = entries.slice(1).map((entry) => {
            const authorName =
              entry
                .querySelector("author > name")
                ?.textContent?.replace("/u/", "") || "unknown";
            const content = entry.querySelector("content")?.textContent || "";
            const updated =
              entry.querySelector("updated")?.textContent || "";
            const idText =
              entry.querySelector("id")?.textContent || String(Math.random());

            const tmp = document.createElement("div");
            tmp.innerHTML = content;
            const bodyText = tmp.textContent || tmp.innerText || "";

            return {
              id: idText,
              author: authorName,
              time: updated
                ? new Date(updated).toLocaleDateString()
                : "recent",
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
        console.warn("[useReddit] refresh comments failed:", err);
        setCommentsError(err instanceof Error ? err.message : String(err));
        setCommentsRetryInfo(null);
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

  return {
    posts,
    after,
    isLoadingPosts,
    hasMorePosts,
    postsError,
    postsRetryInfo,

    comments,
    commentsAfter,
    isLoadingComments,
    hasMoreComments,
    commentsError,
    commentsRetryInfo,

    loadMorePosts,
    loadMoreComments,
    refreshPosts,
    refreshComments,
  };
}
