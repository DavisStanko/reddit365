"use client";

import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { useRedditContext } from "@/components/reddit-context";
import type { SortMode } from "@/lib/use-reddit";

const SORT_OPTIONS: SortMode[] = ["hot", "new", "top"];

export function PostList() {
  const {
    activeFeed,
    selectedPost,
    setSelectedPost,
    currentSort,
    setCurrentSort,
  } = useAppContext();

  const {
    posts,
    isLoadingPosts,
    hasMorePosts,
    postsError,
    postsRetryInfo,
    loadMorePosts,
    refreshPosts,
  } = useRedditContext();

  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Scroll to top when feed/sort changes
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeFeed, currentSort]);

  // Infinite scroll via IntersectionObserver.
  // Uses listRef as root so the sentinel only triggers when the user actually
  // scrolls to the bottom inside the list container, not on initial render.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const list = listRef.current;
    if (!sentinel || !list) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !isLoadingPosts) {
          loadMorePosts();
        }
      },
      { root: list, rootMargin: "200px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMorePosts, isLoadingPosts, loadMorePosts]);

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
              <div className="post-item__content">
                <div className="post-item__sender-row">
                  <span className="post-item__sender">
                    r/{post.subreddit} • u/{post.author}
                  </span>
                  <span className="post-item__time">{post.time}</span>
                </div>
                <h3 className="post-item__title">{post.title}</h3>
              </div>
            </article>
          );
        })}

        {isLoadingPosts && (
          <div className="post-list__loading" aria-live="polite">
            {!postsRetryInfo ? (
              <>
                <div className="post-list__loading-row" />
                <div className="post-list__loading-row post-list__loading-row--short" />
                <div className="post-list__loading-row" />
                <div className="post-list__loading-row post-list__loading-row--short" />
              </>
            ) : (
              <div 
                style={{ 
                  margin: "12px 16px", 
                  padding: "12px", 
                  backgroundColor: "#FFF4CE", 
                  borderLeft: "4px solid #FFB900",
                  fontSize: "13px",
                  lineHeight: "1.5"
                }}
              >
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>Rate Limited (429)</div>
                <div style={{ color: "var(--outlook-text-secondary)" }}>
                  Attempt {postsRetryInfo.attempt}
                  <br />
                  Retrying in <strong style={{ color: "var(--outlook-text-primary)" }}>{postsRetryInfo.retryInSeconds}s</strong>...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sentinel for infinite scroll — must be after loading indicator */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {!isLoadingPosts && !hasMorePosts && posts.length > 0 && (
          <div className="post-list__end">— End of feed —</div>
        )}
      </div>
    </div>
  );
}
