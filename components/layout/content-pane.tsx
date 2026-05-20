"use client";

import {
  useEffect,
  useRef,
} from "react";
import { useSettings } from "@/components/settings-context";
import { useAppContext } from "@/components/app-context";
import { useRedditContext } from "@/components/reddit-context";
import type { FlatComment } from "@/lib/types";
import { linkifyText } from "@/lib/linkify";

function CommentNodeUI({ comment }: { comment: FlatComment }) {
  const depth = comment.depth;
  return (
    <div
      className={`reading-view__comment depth-${depth}`}
      style={{
        marginLeft: depth > 0 ? "24px" : "0",
        marginTop: "12px",
        borderLeft: depth > 0 ? "2px solid #E0E0E0" : "none",
        paddingLeft: depth > 0 ? "12px" : "0",
      }}
    >
      <div
        className="reading-view__comment-meta"
        style={{
          fontSize: "12px",
          color: "var(--outlook-text-secondary)",
          marginBottom: "4px",
        }}
      >
        <a 
          href={`https://reddit.com/u/${comment.author}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="outlook-link"
          style={{ fontWeight: "600" }}
        >
          u/{comment.author}
        </a>
      </div>
      <div
        className="reading-view__comment-body"
        style={{ fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}
      >
        {linkifyText(comment.body)}
      </div>
    </div>
  );
}

function CommentThread({ hasBody }: { hasBody: boolean }) {
  const {
    comments,
    isLoadingComments,
    hasMoreComments,
    commentsError,
    loadMoreComments,
  } = useRedditContext();

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Infinite scroll for comments — observe sentinel within the reading-view scroll container
  useEffect(() => {
    observerRef.current?.disconnect();

    // Walk up from sentinel to find the scrollable .reading-view ancestor
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let scrollRoot: HTMLElement | null = sentinel.parentElement;
    while (scrollRoot && !scrollRoot.classList.contains("reading-view")) {
      scrollRoot = scrollRoot.parentElement;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreComments();
        }
      },
      { root: scrollRoot, rootMargin: "200px" },
    );

    observerRef.current.observe(sentinel);

    return () => observerRef.current?.disconnect();
  }, [loadMoreComments]);

  return (
    <div
      className="reading-view__comments"
      style={{ marginTop: hasBody ? "24px" : "12px", paddingBottom: "40px" }}
    >
      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
        Replies
      </h3>
      <div style={{ color: "var(--outlook-text-secondary)", fontSize: "12px", marginBottom: "16px" }}>
        Replies are displayed as a flat list due to API constraints.
      </div>
      {commentsError && (
        <div
          style={{ color: "#a4262c", fontSize: "14px", marginBottom: "12px" }}
          role="alert"
        >
          {commentsError}
        </div>
      )}
      {isLoadingComments && comments.length === 0 && (
        <div
          style={{ color: "var(--outlook-text-secondary)", fontSize: "14px" }}
        >
          Loading replies...
        </div>
      )}
      {!isLoadingComments && comments.length === 0 && !commentsError && (
        <div
          style={{ color: "var(--outlook-text-secondary)", fontSize: "14px" }}
        >
          No replies yet.
        </div>
      )}

      {comments.map((comment, idx) => (
        <CommentNodeUI key={`${comment.id}-${idx}`} comment={comment} />
      ))}

      <div ref={sentinelRef} aria-hidden="true" />

      {isLoadingComments && comments.length > 0 && (
        <div
          style={{
            color: "var(--outlook-text-secondary)",
            fontSize: "14px",
            marginTop: "12px",
          }}
        >
          Loading more replies...
        </div>
      )}

      {!isLoadingComments && !hasMoreComments && comments.length > 0 && (
        <div
          style={{
            color: "var(--outlook-text-tertiary)",
            fontSize: "13px",
            marginTop: "16px",
            textAlign: "center",
          }}
        >
          — End of replies —
        </div>
      )}
    </div>
  );
}

export function ContentPane() {
  const { mediaEnabled } = useSettings();
  const { selectedPost: post } = useAppContext();
  const readingViewRef = useRef<HTMLDivElement | null>(null);
  const mediaUrl = post?.mediaUrl ?? post?.imageUrl;
  const mediaType = post?.mediaType ?? "image";

  if (!post) {
    return (
      <section
        className="content-pane content-pane--blank"
        aria-label="Content"
      />
    );
  }

  return (
    <section
      className="content-pane content-pane--reading"
      aria-label="Content"
    >
      <div className="reading-view" ref={readingViewRef}>
        <div className="reading-view__header" style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--outlook-border)" }}>
          <h1 className="reading-view__title" style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
            {post.permalink ? (
              <a href={post.permalink} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                {post.title}
              </a>
            ) : (
              post.title
            )}
          </h1>
          <div className="reading-view__email-meta" style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "14px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--outlook-blue)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", fontWeight: "600", fontSize: "16px", flexShrink: 0 }}>
                {post.author?.[0]?.toUpperCase() || "U"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <a 
                    href={`https://reddit.com/u/${post.author}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="outlook-link"
                    style={{ fontSize: "14px", fontWeight: "600" }}
                  >
                    u/{post.author}
                  </a>
                  <span style={{ fontSize: "12px", color: "var(--outlook-text-tertiary)" }}>{post.time}</span>
                </div>
                <div style={{ color: "var(--outlook-text-secondary)", fontSize: "12px" }}>
                  To: <a 
                    href={`https://reddit.com/r/${post.subreddit}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="outlook-link"
                    style={{ fontWeight: "600" }}
                  >
                    r/{post.subreddit}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {mediaEnabled && mediaUrl && (
          <div className="reading-view__media">
            {mediaType === "video" ? (
              <video
                className="reading-view__video"
                controls
                playsInline
                preload="metadata"
                src={mediaUrl}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={mediaUrl}
                alt=""
                className="reading-view__image"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        )}

        {post.externalUrl && (
          <div style={{ margin: "16px 24px", padding: "16px", backgroundColor: "var(--outlook-blue-light)", borderLeft: "4px solid var(--outlook-blue)" }}>
            <div style={{ fontSize: "12px", color: "var(--outlook-text-secondary)", marginBottom: "4px" }}>
              External Link
            </div>
            <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--outlook-blue)", fontWeight: "600", textDecoration: "none", fontSize: "16px", display: "inline-block", wordBreak: "break-all" }}>
              {post.externalUrl}
            </a>
          </div>
        )}

        {post.body && post.body.trim().length > 0 && (
          <div
            className="reading-view__body"
            style={{
              padding: "0 24px 24px",
              borderBottom: "1px solid var(--outlook-border)",
              whiteSpace: "pre-wrap",
              fontSize: "15px",
              lineHeight: "1.6",
            }}
          >
            {linkifyText(post.body)}
          </div>
        )}

        {post.permalink && (
          <CommentThread key={post.id} hasBody={!!(post.body && post.body.trim().length > 0)} />
        )}
      </div>
    </section>
  );
}
