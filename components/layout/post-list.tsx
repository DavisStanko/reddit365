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
    loadMorePosts,
    refreshPosts,
  } = useRedditContext();

  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Scroll to top when feed/sort changes
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeFeed, currentSort]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !isLoadingPosts) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 },
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
                <h3 className="post-item__title">{post.title}</h3>
                <div className="post-item__meta">
                  <span className="post-item__sub">
                    {post.subreddit}
                  </span>
                  <span className="post-item__dot">·</span>
                  <span className="post-item__author">
                    u/{post.author}
                  </span>
                  <span className="post-item__dot">·</span>
                  <span className="post-item__time">{post.time}</span>
                </div>
              </div>
            </article>
          );
        })}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} style={{ height: 1 }} />

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
