"use client";

import {
  useEffect,
  useRef,
} from "react";
import { RefreshCw } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { useRedditContext } from "@/components/reddit-context";
import type { FlatComment } from "@/lib/types";
import { linkifyText } from "@/lib/linkify";
import { MediaEmbedList } from "@/lib/media-embed";

function CommentNodeUI({ comment }: { comment: FlatComment }) {
  return (
    <div
      className={`reading-view__comment depth-0`}
      style={{
        marginLeft: "0",
        marginTop: "12px",
        borderLeft: "none",
        paddingLeft: "0",
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
          className="reading-view__meta-link"
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
      {comment.mediaUrls && comment.mediaUrls.length > 0 && (
        <MediaEmbedList
          mediaList={comment.mediaUrls}
          style={{ marginTop: "8px" }}
        />
      )}
    </div>
  );
}

function CommentThread() {
  const { selectedPost: post } = useAppContext();
  const {
    comments,
    isLoadingComments,
    hasFetchedComments,
    hasMoreComments,
    commentsError,
    commentsRetryInfo,
    loadMoreComments,
    refreshComments,
  } = useRedditContext();

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Infinite scroll for comments — observe sentinel within the reading-view scroll container
  useEffect(() => {
    observerRef.current?.disconnect();

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
      style={{ padding: "24px 24px 40px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>
          Replies
        </h3>
        {!(!hasFetchedComments && !isLoadingComments && !commentsError) && (
          <button
            className="post-list__header-btn"
            type="button"
            aria-label="Refresh Replies"
            onClick={refreshComments}
            title="Refresh Replies"
            style={{ width: "24px", height: "24px" }}
            disabled={isLoadingComments}
          >
            <RefreshCw
              size={14}
              className={
                isLoadingComments && comments.length === 0
                  ? "post-list__icon-spin"
                  : ""
              }
            />
          </button>
        )}
      </div>
      <div style={{ color: "var(--outlook-text-secondary)", fontSize: "12px", padding: "0 24px 16px 24px", margin: "0 -24px 16px -24px", borderBottom: "1px solid var(--outlook-border)" }}>
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
        <div style={{ paddingBottom: "12px" }}>
          {!commentsRetryInfo ? (
            <div style={{ color: "var(--outlook-text-secondary)", fontSize: "14px" }}>
              Loading replies...
            </div>
          ) : (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#FFF4CE",
                borderLeft: "4px solid #FFB900",
                fontSize: "13px",
                lineHeight: "1.5"
              }}
            >
              <div style={{ fontWeight: "600", marginBottom: "4px" }}>Rate Limited (429)</div>
              <div style={{ color: "var(--outlook-text-secondary)" }}>
                Attempt {commentsRetryInfo.attempt}
                <br />
                Retrying in <strong style={{ color: "var(--outlook-text-primary)" }}>{commentsRetryInfo.retryInSeconds}s</strong>...
              </div>
            </div>
          )}
        </div>
      )}
      {!hasFetchedComments && !isLoadingComments && !commentsError && (
        <div style={{ padding: "12px 0" }}>
          <button
            onClick={refreshComments}
            className="reading-view__fetch-comments-btn"
            style={{
              padding: "6px 16px",
              backgroundColor: "var(--outlook-folder-bg)",
              border: "1px solid var(--outlook-border)",
              borderRadius: "4px",
              fontSize: "14px",
              color: "var(--outlook-text-primary)",
              cursor: "pointer",
            }}
          >
            Load replies
          </button>
        </div>
      )}
      {hasFetchedComments && !isLoadingComments && comments.length === 0 && !commentsError && (
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
            padding: "0 20px",
            lineHeight: "1.4"
          }}
        >
          {comments.length >= 50 ? (
            <>
              Reddit&apos;s unauthenticated feed is limited to the first 50 replies.
              <br />
              <a
                href={post?.permalink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--outlook-blue)", textDecoration: "none" }}
                onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                View full thread on Reddit
              </a> to see more.
            </>
          ) : (
            "— End of replies —"
          )}
        </div>
      )}
    </div>
  );
}

export function ContentPane() {
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

  const hasBody = !!(post.body && post.body.trim().length > 0);
  const hasMedia = !!mediaUrl || !!post.isGallery;
  const hasVideoPost = !!post.isVideo;
  const hasEmbed = !!post.embedUrl;
  const hasExternalLink = !!post.externalUrl && !post.isGallery && !hasEmbed && !post.isVideo;
  const hasContent = hasBody || hasMedia || hasExternalLink || hasEmbed || hasVideoPost;

  return (
    <section
      className="content-pane content-pane--reading reading-view"
      aria-label="Content"
      style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "var(--outlook-folder-bg)", overflowY: "auto" }}
      ref={readingViewRef}
    >
      <div className="reading-view__subject-card" style={{ display: "flex", alignItems: "center", height: "48px", boxSizing: "border-box", backgroundColor: "#ffffff", borderRadius: "4px", padding: "0 24px", margin: "0 12px", flexShrink: 0, boxShadow: "0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)" }}>
        <h1 className="reading-view__title" style={{ fontSize: "16px", fontWeight: "600", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {post.permalink ? (
            <a href={post.permalink} target="_blank" rel="noopener noreferrer">
              {post.title}
            </a>
          ) : (
            post.title
          )}
        </h1>
      </div>

      <div style={{ height: "12px", flexShrink: 0 }} />

      <div className="reading-view__body-card" style={{ backgroundColor: "#ffffff", borderRadius: "4px", margin: "0 12px", flexShrink: 0, boxShadow: "0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)" }}>
        <div className="reading-view__header" style={{ padding: "16px 24px 16px", borderBottom: "1px solid var(--outlook-border)" }}>
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
                    className="reading-view__meta-link"
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
                    className="reading-view__meta-link"
                    style={{ fontWeight: "600" }}
                  >
                    r/{post.subreddit}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="reading-view__post-content"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            padding: hasContent ? "20px 0" : "0"
          }}
        >
          {hasMedia && (
            <div className="reading-view__media" style={{ padding: "0 24px" }}>
              {mediaUrl && (
                mediaType === "video" ? (
                  <video
                    className="reading-view__video"
                    controls
                    playsInline
                    preload="metadata"
                    src={mediaUrl}
                    style={{ display: "block" }}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={mediaUrl}
                    alt=""
                    className="reading-view__image"
                    style={{ display: "block" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )
              )}
              {post.isGallery && (
                <div style={{ marginTop: "16px", fontSize: "13px", color: "var(--outlook-text-tertiary)", textAlign: "center", lineHeight: "1.4" }}>
                  This is a gallery post with multiple images, but Reddit&apos;s public feed only provides the first one.
                  <br />
                  <a
                    href={post.externalUrl || post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--outlook-blue)", textDecoration: "none" }}
                    onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    View full gallery on Reddit
                  </a> to see more.
                </div>
              )}
            </div>
          )}

          {hasVideoPost && (
            <div className="reading-view__media" style={{ padding: "0 24px" }}>
              {post.thumbnailUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  className="reading-view__image"
                  style={{ display: "block" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div style={{ marginTop: post.thumbnailUrl ? "12px" : "0", fontSize: "13px", color: "var(--outlook-text-tertiary)", lineHeight: "1.4" }}>
                🎬{" "}
                <a
                  href={post.externalUrl || post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--outlook-blue)", textDecoration: "none" }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  Watch video on Reddit
                </a>
              </div>
            </div>
          )}

          {hasEmbed && (
            <div className="reading-view__embed" style={{ padding: "0 24px" }}>
              <iframe
                src={post.embedUrl}
                width="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ 
                  borderRadius: "4px", 
                  backgroundColor: "#000",
                  aspectRatio: post.embedType === "youtube" || post.embedType === "streamable" ? "16/9" : undefined,
                  height: post.embedType === "youtube" || post.embedType === "streamable" ? "auto" : "550px",
                  maxWidth: "800px"
                }}
              />
            </div>
          )}

          {hasExternalLink && (
            <div style={{ margin: "0 24px", padding: "16px", backgroundColor: "var(--outlook-blue-light)", borderLeft: "4px solid var(--outlook-blue)" }}>
              <div style={{ fontSize: "12px", color: "var(--outlook-text-secondary)", marginBottom: "4px" }}>
                External Link
              </div>
              <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="reading-view__external-link">
                {post.externalUrl}
              </a>
            </div>
          )}

          {hasBody && (
            <div
              className="reading-view__body"
              style={{
                padding: "0 24px",
                whiteSpace: "pre-wrap",
                fontSize: "15px",
                lineHeight: "1.6",
              }}
            >
              {linkifyText(post.body || "")}
            </div>
          )}
        </div>
      </div>

      {post.permalink && (
        <>
          <div style={{ height: "12px", flexShrink: 0 }} />
          <div className="reading-view__replies-card" style={{ backgroundColor: "#ffffff", borderRadius: "4px", margin: "0 12px 12px 12px", boxShadow: "0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)" }}>
            <CommentThread key={post.id} />
          </div>
        </>
      )}
    </section>
  );
}
