"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Filter, SortAsc, MoreHorizontal } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import type { Post } from "@/lib/sample-posts";

const FEEDS: Record<string, { sub?: string; empty?: boolean }> = {
  frontpage: { sub: "frontpage" },
  all: { sub: "all" },
  popular: { sub: "popular" },
  askreddit: { sub: "askreddit" },
  worldnews: { sub: "worldnews" },
  programming: { sub: "programming" },
  technology: { sub: "technology" },
  science: { sub: "science" },
  gaming: { sub: "gaming" },
  movies: { sub: "movies" },
  music: { sub: "music" },
};

// Map folder-pane id to Reddit path segment (handled by API now)
// Local API route handles data mapping

export function PostList() {
  const {
    activeFeed,
    selectedPost,
    setSelectedPost,
    sortMode,
    setSortMode,
  } = useAppContext();

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
  const listRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const afterRef = useRef<string | null>(null);

  const doFetch = useCallback(
    async (
      feed: string,
      sort: string,
      afterToken: string | null,
      append: boolean,
    ) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const feedConfig = FEEDS[feed] ?? { sub: feed };

        const params = new URLSearchParams({
          sub: feedConfig.sub ?? "all",
          sort,
        });
        if (sort === "top") {
          params.set("t", "all");
        }
        if (afterToken) params.set("after", afterToken);
        const url = `/api/posts?${params.toString()}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const newPosts: Post[] = data.posts || [];
        const nextAfter: string | null = data.after || null;

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
    [],
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

    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }

    void Promise.resolve().then(() => {
      void doFetch(activeFeed, sortMode, null, false);
    });
  }, [activeFeed, sortMode, doFetch]);

  // Infinite scroll: watch sentinel
  useEffect(() => {
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingRef.current &&
          afterRef.current
        ) {
          doFetch(activeFeed, sortMode, afterRef.current, true);
        }
      },
      { root: listRef.current, rootMargin: "200px" },
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
          : `r/${activeFeed}`;

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
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div
          className="post-list__header-actions"
          aria-label="Mail list actions"
        >
          <button
            className="post-list__header-btn"
            type="button"
            aria-label="Filter"
          >
            <Filter size={14} />
          </button>
          <button
            className="post-list__header-btn"
            type="button"
            aria-label="Sort"
          >
            <SortAsc size={14} />
          </button>
          <button
            className="post-list__header-btn"
            type="button"
            aria-label="More options"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <div ref={listRef} className="post-list__items" role="list">
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
        <div
          ref={sentinelRef}
          className="post-list__sentinel"
          aria-hidden="true"
        />

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
