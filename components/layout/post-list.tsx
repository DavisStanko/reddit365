"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAppContext } from "@/components/app-context";
import type { Post } from "@/lib/sample-posts";

const SORT_LABELS = {
  hot: "Hot",
  new: "New",
  top: "Top",
} as const;

/** Map folder-pane id → Reddit path segment */
function buildRedditUrl(sub: string, sort: string, after?: string | null): string {
  let path: string;
  const sortSuffix = sort === "hot" ? "" : `/${sort}`;

  switch (sub) {
    case "frontpage":
      path = sort === "hot" ? "/" : `/${sort}`;
      break;
    case "all":
      path = `/r/all${sortSuffix}`;
      break;
    case "popular":
      path = `/r/popular${sortSuffix}`;
      break;
    default: {
      const name = sub.startsWith("r/") ? sub.slice(2) : sub;
      path = `/r/${name}${sortSuffix}`;
      break;
    }
  }

  const params = new URLSearchParams({ limit: "25", raw_json: "1" });
  if (after) params.set("after", after);

  return `https://www.reddit.com${path}.json?${params.toString()}`;
}

function formatAge(created_utc: number): string {
  const diffMs = Date.now() - created_utc * 1000;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRedditPost(d: any, idx: number): Post {
  const body: string =
    d.selftext?.trim()
      ? d.selftext
      : d.url && !d.url.startsWith("https://www.reddit.com")
      ? `[Link post] ${d.url}`
      : "(No body text)";

  let imageUrl: string | undefined;
  if (d.post_hint === "image" && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(d.url ?? "")) {
    imageUrl = d.url;
  } else if (d.preview?.images?.[0]?.source?.url) {
    imageUrl = (d.preview.images[0].source.url as string).replace(/&amp;/g, "&");
  }

  return {
    id: idx,
    title: d.title,
    subreddit: `r/${d.subreddit}`,
    author: d.author,
    time: formatAge(d.created_utc),
    score: formatScore(d.score),
    comments: d.num_comments ?? 0,
    body,
    imageUrl,
  };
}

export function PostList() {
  const { activeFeed, selectedPost, setSelectedPost, sortMode, setSortMode } =
    useAppContext();

  const [posts, setPosts] = useState<Post[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort controller ref so we can cancel stale requests when feed changes
  const abortRef = useRef<AbortController | null>(null);

  // Track the last feed+sort we loaded so the IntersectionObserver
  // doesn't re-fetch on mount after the feed-change effect already did it
  const loadedKeyRef = useRef<string>("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const afterRef = useRef<string | null>(null);

  const doFetch = useCallback(
    async (feed: string, sort: string, afterToken: string | null, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = buildRedditUrl(feed, sort, afterToken);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json: any = await res.json();
        const children = json?.data?.children ?? [];
        const nextAfter: string | null = json?.data?.after ?? null;

        const newPosts: Post[] = children
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => c.kind === "t3")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any, i: number) => mapRedditPost(c.data, append ? (posts.length + i) : i));

        afterRef.current = nextAfter;
        setAfter(nextAfter);

        if (append) {
          setPosts((prev) => [...prev, ...newPosts]);
        } else {
          setPosts(newPosts);
        }
      } catch (e: unknown) {
        if ((e as { name?: string }).name === "AbortError") return;
        setError("Could not load posts — Reddit may be blocking the request.");
        console.error("[PostList]", e);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // When feed or sort changes → reset and fetch first page
  useEffect(() => {
    const key = `${activeFeed}::${sortMode}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    abortRef.current?.abort();
    setPosts([]);
    setAfter(null);
    afterRef.current = null;
    setError(null);

    doFetch(activeFeed, sortMode, null, false);
  }, [activeFeed, sortMode, doFetch]);

  // Infinite scroll: watch sentinel
  useEffect(() => {
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && afterRef.current) {
          doFetch(activeFeed, sortMode, afterRef.current, true);
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [activeFeed, sortMode, doFetch]);

  // Human-readable feed name
  const feedLabel =
    activeFeed === "frontpage"
      ? "Front Page"
      : activeFeed === "all"
      ? "r/All"
      : activeFeed === "popular"
      ? "r/Popular"
      : `r/${activeFeed.startsWith("r/") ? activeFeed.slice(2) : activeFeed}`;

  return (
    <div className="post-list">
      <div className="post-list__header">
        <div className="post-list__feed-name">{feedLabel}</div>
        <div className="post-list__tabs" role="tablist">
          {(["hot", "new", "top"] as const).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={sortMode === mode}
              className={`post-list__tab${
                sortMode === mode ? " post-list__tab--active" : ""
              }`}
              onClick={() => setSortMode(mode)}
            >
              {SORT_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="post-list__items" role="list">
        {error && (
          <div className="post-list__error" role="alert">
            {error}
          </div>
        )}

        {posts.map((post, idx) => {
          const isSelected =
            selectedPost?.title === post.title &&
            selectedPost?.author === post.author;
          return (
            <article
              key={`${activeFeed}-${idx}`}
              className={`post-item${isSelected ? " post-item--selected" : ""}`}
              onClick={() => setSelectedPost(post)}
              role="listitem"
              tabIndex={0}
              aria-current={isSelected ? "true" : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedPost(post);
                }
              }}
            >
              <div className="post-item__votes">
                <span className="post-item__score">{post.score}</span>
              </div>
              <div className="post-item__content">
                <h3 className="post-item__title">{post.title}</h3>
                <div className="post-item__meta">
                  <span className="post-item__sub">{post.subreddit}</span>
                  <span className="post-item__dot">·</span>
                  <span className="post-item__author">u/{post.author}</span>
                  <span className="post-item__dot">·</span>
                  <span className="post-item__time">{post.time}</span>
                </div>
                <div className="post-item__stats">
                  <span>{post.comments.toLocaleString()} comments</span>
                </div>
              </div>
            </article>
          );
        })}

        {/* Infinite scroll sentinel — placed BEFORE loading so observer fires
            before reaching the very bottom */}
        <div ref={sentinelRef} className="post-list__sentinel" aria-hidden="true" />

        {loading && (
          <div className="post-list__loading" aria-live="polite">
            <div className="post-list__loading-row" />
            <div className="post-list__loading-row post-list__loading-row--short" />
            <div className="post-list__loading-row" />
            <div className="post-list__loading-row post-list__loading-row--short" />
          </div>
        )}

        {!loading && !after && posts.length > 0 && (
          <div className="post-list__end">— End of feed —</div>
        )}
      </div>
    </div>
  );
}
