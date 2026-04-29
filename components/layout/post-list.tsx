"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X, ChevronDown } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { useReddit, type SortMode, type Timeframe } from "@/lib/use-reddit";

const SORT_OPTIONS: SortMode[] = ["hot", "new", "top", "rising"];
const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "hour", label: "Past Hour" },
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export function PostList() {
  const {
    activeFeed,
    selectedPost,
    setSelectedPost,
    currentSort,
    setCurrentSort,
    currentTimeframe,
    setCurrentTimeframe,
  } = useAppContext();

  const {
    posts,
    isLoadingPosts,
    hasMorePosts,
    postsError,
    loadMorePosts,
    refreshPosts,
  } = useReddit(activeFeed, currentSort, currentTimeframe, selectedPost);

  const [showFrontpageBanner, setShowFrontpageBanner] = useState(true);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll to top when feed/sort/timeframe changes
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeFeed, currentSort, currentTimeframe]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      },
      { root: listRef.current, rootMargin: "200px" },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMorePosts]);

  // Close time dropdown on outside click
  useEffect(() => {
    if (!showTimeDropdown) return;
    const handler = () => setShowTimeDropdown(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showTimeDropdown]);

  return (
    <div className="post-list">
      <div className="post-list__header">
        <div className="post-list__header-main">
          <div
            className="post-list__tabs"
            role="tablist"
            aria-label="Post sort options"
          >
            {SORT_OPTIONS.map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={currentSort === mode}
                className={`post-list__tab${
                  currentSort === mode ? " post-list__tab--active" : ""
                }`}
                onClick={() => setCurrentSort(mode)}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Time range picker — only visible when "top" is selected */}
          {currentSort === "top" && (
            <div
              className="post-list__time-picker"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="post-list__time-btn"
                onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                type="button"
              >
                {TIMEFRAMES.find((t) => t.value === currentTimeframe)?.label ??
                  "Today"}
                <ChevronDown size={12} />
              </button>
              {showTimeDropdown && (
                <div className="post-list__time-dropdown">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      className={`post-list__time-option${
                        currentTimeframe === tf.value
                          ? " post-list__time-option--active"
                          : ""
                      }`}
                      onClick={() => {
                        setCurrentTimeframe(tf.value);
                        setShowTimeDropdown(false);
                      }}
                      type="button"
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="post-list__header-actions" aria-label="Mail list actions">
          <button
            className="post-list__header-btn"
            type="button"
            aria-label="Refresh"
            onClick={refreshPosts}
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={
                isLoadingPosts && posts.length === 0
                  ? "post-list__icon-spin"
                  : ""
              }
            />
          </button>
        </div>
      </div>

      <div ref={listRef} className="post-list__items" role="list">
        {activeFeed === "frontpage" && showFrontpageBanner && (
          <div className="post-list__banner">
            <span>Sign in with Reddit to see your personal frontpage.</span>
            <button
              onClick={() => setShowFrontpageBanner(false)}
              aria-label="Dismiss banner"
              className="post-list__banner-close"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {postsError && (
          <div className="post-list__error" role="alert">
            {postsError}
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
