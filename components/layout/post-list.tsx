"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useTransition,
} from "react";
import { useAppContext } from "@/components/app-context";
import type { Post } from "@/lib/sample-posts";
import type { PostsResponse } from "@/lib/reddit-api";

const SORT_LABELS = {
  hot: "Hot",
  new: "New",
  top: "Top",
} as const;

export function PostList() {
  const { activeFeed, selectedPost, setSelectedPost, sortMode, setSortMode } =
    useAppContext();

  const [posts, setPosts] = useState<Post[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Track which feed+sort we've already fetched to avoid double-fetching
  const feedRef = useRef<string>("");
  const sortRef = useRef<string>("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch a page of posts; if `reset` is true, clear existing posts first
  const fetchPosts = useCallback(
    async (feed: string, sort: string, afterToken: string | null, reset: boolean) => {
      if (loading) return;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ sub: feed, sort });
        if (afterToken) params.set("after", afterToken);
        const res = await fetch(`/api/posts?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: PostsResponse = await res.json();

        if (reset) {
          startTransition(() => {
            setPosts(data.posts);
          });
        } else {
          startTransition(() => {
            setPosts((prev) => [...prev, ...data.posts]);
          });
        }
        setAfter(data.after);
      } catch (e) {
        setError("Failed to load posts. Reddit may be rate-limiting us.");
        console.error("[PostList] fetch error:", e);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  // When feed or sort changes, reset and fetch fresh
  useEffect(() => {
    if (feedRef.current === activeFeed && sortRef.current === sortMode) return;
    feedRef.current = activeFeed;
    sortRef.current = sortMode;

    setPosts([]);
    setAfter(null);

    // Kick off first fetch
    fetch(`/api/posts?sub=${activeFeed}&sort=${sortMode}`)
      .then((r) => r.json())
      .then((data: PostsResponse) => {
        startTransition(() => setPosts(data.posts));
        setAfter(data.after);
        setError(null);
      })
      .catch(() => setError("Failed to load posts."))
      .finally(() => setLoading(false));

    setLoading(true);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeed, sortMode]);

  // Set up IntersectionObserver on the sentinel div
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loading && after) {
          fetchPosts(activeFeed, sortMode, after, false);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loading, after, activeFeed, sortMode, fetchPosts]);

  // Human-readable feed name for the header
  const feedLabel = activeFeed === "frontpage"
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
              className={`post-list__tab${sortMode === mode ? " post-list__tab--active" : ""}`}
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
          const isSelected = selectedPost?.id === post.id && selectedPost?.title === post.title;
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

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="post-list__sentinel" aria-hidden="true" />

        {(loading || isPending) && (
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
