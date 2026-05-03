"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Filter, Inbox, SortAsc } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import type { Post } from "@/lib/sample-posts";

const FEEDS: Record<string, { sub?: string; empty?: boolean }> = {
  inbox: { empty: true },
  sent: { sub: "all" },
  drafts: { sub: "new" },
  deleted: { sub: "top" },
  junk: { sub: "popular" },
  archive: { sub: "all" },
  history: { sub: "science" },
  search: { sub: "technology" },
};

// Map folder-pane id to Reddit path segment (handled by API now)
// Local API route handles data mapping

export function PostList() {
  const { activeFeed, selectedPost, setSelectedPost, sortMode } =
    useAppContext();

  const [posts, setPosts] = useState<Post[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailTab, setMailTab] = useState<"Focused" | "Other">("Other");

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
        const feedConfig = FEEDS[feed] ?? {};
        if (feedConfig.empty) {
          afterRef.current = null;
          setAfter(null);
          setPosts([]);
          return;
        }

        const params = new URLSearchParams({
          sub: feedConfig.sub ?? "all",
          sort,
        });
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

    const feedConfig = FEEDS[activeFeed] ?? {};
    if (feedConfig.empty) {
      loadingRef.current = false;
      return;
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
      { rootMargin: "200px" },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [activeFeed, sortMode, doFetch]);

  // Human-readable feed name
  const isInbox = activeFeed === "inbox";

  return (
    <div className="post-list">
      <div className="post-list__header">
        <div
          className="post-list__tabs"
          role="tablist"
          aria-label="Focused and other mail"
        >
          {(["Focused", "Other"] as const).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={mailTab === mode}
              className={`post-list__tab${
                mailTab === mode ? " post-list__tab--active" : ""
              }`}
              onClick={() => setMailTab(mode)}
            >
              {mode}
            </button>
          ))}
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
            <Inbox size={14} />
          </button>
        </div>
      </div>

      <div className="post-list__items" role="list">
        {isInbox && (
          <div className="post-list__empty" aria-label="Empty inbox">
            <div className="post-list__empty-icon">
              <svg
                width="90"
                height="90"
                viewBox="0 0 90 90"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="15"
                  y="13"
                  width="60"
                  height="62"
                  rx="14"
                  fill="#ECEDEF"
                />
                <path
                  d="M19 46C31 46 34 60 45 60C56 60 59 46 71 46V62C71 67.5228 66.5228 72 61 72H29C23.4772 72 19 67.5228 19 62V46Z"
                  fill="#C9CDD3"
                />
                <path
                  d="M20 44H70"
                  stroke="#B8BCC3"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 className="post-list__empty-title">Nothing left to read</h2>
            <p className="post-list__empty-subtitle">Enjoy your empty inbox.</p>
          </div>
        )}

        {error && (
          <div className="post-list__error" role="alert">
            {error}
          </div>
        )}

        {!isInbox &&
          posts.map((post, idx) => {
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

        {loading && !isInbox && (
          <div className="post-list__loading" aria-live="polite">
            <div className="post-list__loading-row" />
            <div className="post-list__loading-row post-list__loading-row--short" />
            <div className="post-list__loading-row" />
            <div className="post-list__loading-row post-list__loading-row--short" />
          </div>
        )}

        {!loading && !after && posts.length > 0 && !isInbox && (
          <div className="post-list__end">— End of feed —</div>
        )}
      </div>
    </div>
  );
}
