"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Bookmark,
  Award,
  MoreHorizontal,
} from "lucide-react";
import type { RedditCommentPageItem } from "@/lib/reddit-api";
import { useSettings } from "@/components/settings-context";
import { useAppContext } from "@/components/app-context";

type CommentItem = RedditCommentPageItem;

function CommentNode({ comment }: { comment: CommentItem }) {
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
        <strong>u/{comment.author}</strong>{" "}
        <span style={{ margin: "0 4px" }}>·</span> {comment.time}{" "}
        <span style={{ margin: "0 4px" }}>·</span> {comment.score} points
      </div>
      <div
        className="reading-view__comment-body"
        style={{ fontSize: "14px", lineHeight: "1.5" }}
      >
        {comment.body}
      </div>
    </div>
  );
}

function CommentThread({
  permalink,
  scrollRootRef,
}: {
  permalink: string;
  scrollRootRef: RefObject<HTMLDivElement | null>;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const requestIdRef = useRef(0);

  const loadComments = useCallback(
    async (cursor: string | null, replace: boolean) => {
      const requestId = ++requestIdRef.current;
      setError(null);

      if (replace) {
        setLoadingComments(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          permalink,
          limit: "5",
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const res = await fetch(`/api/comments?${params.toString()}`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          comments?: CommentItem[];
          nextCursor?: string | null;
        };

        if (requestId !== requestIdRef.current) return;

        const pageComments = Array.isArray(data.comments) ? data.comments : [];
        setComments((prev) =>
          replace ? pageComments : [...prev, ...pageComments],
        );
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to load comments:", err);
        setError("Could not load replies right now.");
      } finally {
        if (requestId !== requestIdRef.current) return;
        if (replace) {
          setLoadingComments(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [permalink],
  );

  useEffect(() => {
    requestIdRef.current += 1;
    let active = true;

    queueMicrotask(() => {
      if (active) {
        void loadComments(null, true);
      }
    });

    return () => {
      active = false;
      requestIdRef.current += 1;
    };
  }, [loadComments, permalink]);

  useEffect(() => {
    observerRef.current?.disconnect();

    const root = scrollRootRef.current;
    const sentinel = sentinelRef.current;

    if (!root || !sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingComments &&
          !loadingMore &&
          nextCursor
        ) {
          void loadComments(nextCursor, false);
        }
      },
      { root, rootMargin: "200px" },
    );

    observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadComments, loadingComments, loadingMore, nextCursor, scrollRootRef]);

  return (
    <div
      className="reading-view__comments"
      style={{ marginTop: "24px", paddingBottom: "40px" }}
    >
      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
        Replies
      </h3>
      {error && (
        <div
          style={{ color: "#a4262c", fontSize: "14px", marginBottom: "12px" }}
          role="alert"
        >
          {error}
        </div>
      )}
      {loadingComments && (
        <div
          style={{ color: "var(--outlook-text-secondary)", fontSize: "14px" }}
        >
          Loading replies...
        </div>
      )}
      {!loadingComments && comments.length === 0 && (
        <div
          style={{ color: "var(--outlook-text-secondary)", fontSize: "14px" }}
        >
          No replies yet.
        </div>
      )}
      {!loadingComments &&
        comments.map((comment) => (
          <CommentNode
            key={`${comment.id}-${comment.depth}`}
            comment={comment}
          />
        ))}
      <div ref={sentinelRef} aria-hidden="true" />
      {loadingMore && (
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
        <div className="reading-view__toolbar">
          <div className="reading-view__toolbar-actions">
            <button className="reading-view__toolbar-btn" title="Reply">
              <MessageSquare size={16} />
              <span>Reply</span>
            </button>
            <button className="reading-view__toolbar-btn" title="Share">
              <Share2 size={16} />
              <span>Share</span>
            </button>
            <button className="reading-view__toolbar-btn" title="Save">
              <Bookmark size={16} />
              <span>Save</span>
            </button>
            <button className="reading-view__toolbar-btn" title="Award">
              <Award size={16} />
              <span>Award</span>
            </button>
            <button className="reading-view__toolbar-btn" title="More">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="reading-view__header">
          <div className="reading-view__meta-row">
            <span className="reading-view__subreddit">{post.subreddit}</span>
            <span className="reading-view__dot">·</span>
            <span className="reading-view__author">
              Posted by u/{post.author}
            </span>
            <span className="reading-view__dot">·</span>
            <span className="reading-view__time">{post.time}</span>
          </div>
          <h1 className="reading-view__title">{post.title}</h1>
        </div>

        <div className="reading-view__vote-bar">
          <button className="reading-view__vote-btn" title="Upvote">
            <ArrowBigUp size={20} />
          </button>
          <span className="reading-view__score">{post.score}</span>
          <button className="reading-view__vote-btn" title="Downvote">
            <ArrowBigDown size={20} />
          </button>
          <span className="reading-view__comment-count">
            <MessageSquare size={14} />
            {post.comments.toLocaleString()} comments
          </span>
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
                alt={post.title}
                className="reading-view__image"
              />
            )}
          </div>
        )}

        <div
          className="reading-view__body"
          style={{
            paddingBottom: "24px",
            borderBottom: "1px solid var(--outlook-border)",
          }}
        >
          {post.body.split("\n\n").map((paragraph, i) => (
            <p key={i} className="reading-view__paragraph">
              {paragraph.split(/(\*\*[^*]+\*\*)/).map((segment, j) => {
                if (segment.startsWith("**") && segment.endsWith("**")) {
                  return <strong key={j}>{segment.slice(2, -2)}</strong>;
                }
                return segment;
              })}
            </p>
          ))}
        </div>

        {post.permalink && (
          <CommentThread
            key={post.permalink}
            permalink={post.permalink}
            scrollRootRef={readingViewRef}
          />
        )}
      </div>
    </section>
  );
}
