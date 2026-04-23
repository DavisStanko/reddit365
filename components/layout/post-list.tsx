"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Filter, SortAsc, MoreHorizontal, RefreshCw, X } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import type { Post } from "@/lib/sample-posts";

function parseRedditPost(d: any): Post {
  const subreddit = `r/${d.subreddit}`;
  const body = d.selftext?.trim()
    ? d.selftext
    : d.url && !d.url.startsWith("https://www.reddit.com")
      ? `[Link post] ${d.url}`
      : "";

  let imageUrl: string | undefined = undefined;
  let mediaUrl: string | undefined = undefined;
  let mediaType: "image" | "video" | undefined = undefined;

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
    const firstItemId = d.gallery_data?.items?.[0]?.media_id;
    const galleryUrl = firstItemId && d.media_metadata?.[firstItemId]?.s?.u;
    if (galleryUrl) {
      const url = galleryUrl.replace(/&amp;/g, "&");
      imageUrl = url;
      mediaUrl = url;
      mediaType = "image";
    }
  } else if (directUrl && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(directUrl)) {
    imageUrl = directUrl;
    mediaUrl = directUrl;
    mediaType = "image";
  } else if (d.preview?.images?.[0]?.source?.url) {
    const url = d.preview.images[0].source.url.replace(/&amp;/g, "&");
    imageUrl = url;
    mediaUrl = url;
    mediaType = "image";
  }

  let scoreStr = "0";
  if (d.score >= 1000) {
    scoreStr = (d.score / 1000).toFixed(1) + "k";
  } else {
    scoreStr = String(d.score || 0);
  }

  let timeStr = "0m";
  if (d.created_utc) {
    const diffMs = Date.now() - d.created_utc * 1000;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) timeStr = `${diffMins}m`;
    else if (diffMins < 60 * 24) timeStr = `${Math.floor(diffMins / 60)}h`;
    else timeStr = `${Math.floor(diffMins / (60 * 24))}d`;
  }

  return {
    id: d.name ? parseInt(d.name.replace(/^t3_/, ""), 36) : Math.floor(Math.random() * 1000000),
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

export function PostList() {
  const {
    activeFeed,
    selectedPost,
    setSelectedPost,
    sortMode,
    setSortMode,
    timeframe,
    setTimeframe,
  } = useAppContext();

  const [posts, setPosts] = useState<Post[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFrontpageBanner, setShowFrontpageBanner] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const loadedKeyRef = useRef<string>("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // We need refs to avoid stale closures in intersection observer
  const loadingRef = useRef(false);
  const afterRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const requestIdRef = useRef(0);

  const buildUrl = useCallback((feed: string, sort: string, t: string, afterToken: string | null) => {
    let basePath = "";
    if (feed === "frontpage" || feed === "popular") {
      basePath = "/r/popular";
    } else if (feed === "all") {
      basePath = "/r/all";
    } else {
      basePath = `/r/${feed.replace(/^r\//, "")}`;
    }

    // Default sort mode implies appending it to path
    let url = `https://www.reddit.com${basePath}/${sort}.json?raw_json=1&limit=25`;
    if (sort === "top") {
      url += `&t=${t}`;
    }
    if (afterToken) {
      url += `&after=${afterToken}`;
    }
    return url;
  }, []);

  const doFetch = useCallback(
    async (
      feed: string,
      sort: string,
      t: string,
      afterToken: string | null,
      append: boolean
    ) => {
      if (loadingRef.current) return;
      if (append && !hasMoreRef.current) return;

      const requestId = ++requestIdRef.current;
      loadingRef.current = true;
      setIsLoadingPosts(true);
      setError(null);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = buildUrl(feed, sort, t, afterToken);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const children = json?.data?.children || [];
        const nextAfter = json?.data?.after || null;

        const newPosts: Post[] = children
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => c.kind === "t3")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => parseRedditPost(c.data));

        if (requestId !== requestIdRef.current) return;

        afterRef.current = nextAfter;
        setAfter(nextAfter);
        hasMoreRef.current = nextAfter !== null;
        setHasMorePosts(nextAfter !== null);

        if (append) {
          setPosts((prev) => {
            const known = new Set(prev.map((post) => post.id));
            const uniquePosts = newPosts.filter((post) => !known.has(post.id));
            return [...prev, ...uniquePosts];
          });
        } else {
          setPosts(newPosts);
        }
      } catch (e: unknown) {
        if ((e as Error).name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        setError("Could not load posts.");
        console.error("[PostList]", e);
      } finally {
        if (requestId !== requestIdRef.current) return;
        loadingRef.current = false;
        setIsLoadingPosts(false);
      }
    },
    [buildUrl]
  );

  const resetAndFetch = useCallback(() => {
    setPosts([]);
    setAfter(null);
    setHasMorePosts(true);
    afterRef.current = null;
    hasMoreRef.current = true;
    setError(null);
    listRef.current?.scrollTo({ top: 0, behavior: "instant" });
    void doFetch(activeFeed, sortMode, timeframe, null, false);
  }, [activeFeed, sortMode, timeframe, doFetch]);

  // Initial fetch on feed/sort/timeframe change
  useEffect(() => {
    const key = `${activeFeed}::${sortMode}::${timeframe}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    resetAndFetch();
  }, [activeFeed, sortMode, timeframe, resetAndFetch]);

  // Infinite scroll
  useEffect(() => {
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingRef.current &&
          hasMoreRef.current &&
          afterRef.current
        ) {
          doFetch(activeFeed, sortMode, timeframe, afterRef.current, true);
        }
      },
      { root: listRef.current, rootMargin: "200px" }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [activeFeed, sortMode, timeframe, doFetch]);

  const feedLabel =
    activeFeed === "frontpage"
      ? "Front Page"
      : activeFeed === "all"
      ? "r/All"
      : activeFeed === "popular"
      ? "r/Popular"
      : `r/${activeFeed.replace(/^r\//, "")}`;

  return (
    <div className="post-list">
      <div className="post-list__header">
        <div className="post-list__feed-name">{feedLabel}</div>
        <div className="post-list__header-main">
          <div
            className="post-list__tabs"
            role="tablist"
            aria-label="Post sort options"
          >
            {(["hot", "new", "top", "rising"] as const).map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={sortMode === mode}
                className={`post-list__tab${
                  sortMode === mode ? " post-list__tab--active" : ""
                }`}
                onClick={() => setSortMode(mode)}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {sortMode === "top" && (
            <select
              value={timeframe}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="post-list__timeframe-select"
              aria-label="Top timeframe"
              style={{
                marginLeft: "8px",
                padding: "2px 6px",
                fontSize: "12px",
                borderRadius: "4px",
                border: "1px solid var(--outlook-border)",
                background: "transparent",
                color: "var(--outlook-text)",
              }}
            >
              <option value="hour">Past Hour</option>
              <option value="day">Past 24 Hours</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
              <option value="all">All Time</option>
            </select>
          )}
        </div>

        <div className="post-list__header-actions" aria-label="Mail list actions">
          <button
            className="post-list__header-btn"
            type="button"
            aria-label="Refresh"
            onClick={resetAndFetch}
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={isLoadingPosts && posts.length === 0 ? "post-list__icon-spin" : ""}
            />
          </button>
          <button className="post-list__header-btn" type="button" aria-label="Filter">
            <Filter size={14} />
          </button>
          <button className="post-list__header-btn" type="button" aria-label="Sort">
            <SortAsc size={14} />
          </button>
          <button className="post-list__header-btn" type="button" aria-label="More options">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <div ref={listRef} className="post-list__items" role="list">
        {activeFeed === "frontpage" && showFrontpageBanner && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "var(--outlook-bg-hover)",
              borderBottom: "1px solid var(--outlook-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
              color: "var(--outlook-text)",
            }}
          >
            <span>Sign in with Reddit to see your personal frontpage.</span>
            <button
              onClick={() => setShowFrontpageBanner(false)}
              aria-label="Dismiss banner"
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {error && (
          <div className="post-list__error" role="alert">
            {error}
          </div>
        )}

        {posts.map((post, idx) => {
          const isSelected = selectedPost?.id === post.id;
          return (
            <article
              key={`${post.id}-${idx}`}
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

        <div ref={sentinelRef} className="post-list__sentinel" aria-hidden="true" />

        {isLoadingPosts && (
          <div className="post-list__loading" aria-live="polite">
            <div className="post-list__loading-row" />
            <div className="post-list__loading-row post-list__loading-row--short" />
            <div className="post-list__loading-row" />
            <div className="post-list__loading-row post-list__loading-row--short" />
          </div>
        )}

        {!isLoadingPosts && !hasMorePosts && posts.length > 0 && (
          <div className="post-list__end">— End of feed —</div>
        )}
      </div>
    </div>
  );
}
