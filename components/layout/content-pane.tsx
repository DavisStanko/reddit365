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
import { useSettings } from "@/components/settings-context";
import { useAppContext } from "@/components/app-context";
import type { Post } from "@/lib/sample-posts";

interface Comment {
  id: string;
  author: string;
  time: string;
  score: string;
  body: string;
  depth: number;
}

function mapCommentNode(c: any, depth = 0): Comment[] {
  if (c.kind !== "t1") return [];
  const d = c.data;
  if (!d || !d.body) return [];

  let timeStr = "0m";
  if (d.created_utc) {
    const diffMs = Date.now() - d.created_utc * 1000;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) timeStr = `${diffMins}m`;
    else if (diffMins < 60 * 24) timeStr = `${Math.floor(diffMins / 60)}h`;
    else timeStr = `${Math.floor(diffMins / (60 * 24))}d`;
  }

  let scoreStr = "0";
  if (d.score !== undefined) {
    if (d.score >= 1000) {
      scoreStr = (d.score / 1000).toFixed(1) + "k";
    } else {
      scoreStr = String(d.score);
    }
  }

  const comment: Comment = {
    id: d.id ?? d.name ?? Math.random().toString(),
    author: d.author ?? "unknown",
    time: timeStr,
    score: scoreStr,
    body: d.body,
    depth,
  };

  let replies: Comment[] = [];
  const repliesData = d.replies as Record<string, unknown> | undefined;
  if (typeof repliesData !== "string" && (repliesData?.data as any)?.children) {
    replies = ((repliesData?.data as any)?.children as any[]).flatMap((reply: Record<string, unknown>) =>
      mapCommentNode(reply, depth + 1)
    );
  }

  return [comment, ...replies];
}

function CommentNodeUI({ comment }: { comment: Comment }) {
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
        style={{ fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}
      >
        {comment.body}
      </div>
    </div>
  );
}

function CommentThread({
  post,
  scrollRootRef,
}: {
  post: Post;
  scrollRootRef: RefObject<HTMLDivElement | null>;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [commentsAfter, setCommentsAfter] = useState<string | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);
  const afterRef = useRef<string | null>(null);

  // Reset comments when post changes
  useEffect(() => {
    setComments([]);
    setCommentsAfter(null);
    afterRef.current = null;
    setError(null);
  }, [post.id]);

  const loadComments = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!post.permalink) return;
      if (loadingRef.current) return;

      const requestId = ++requestIdRef.current;
      setError(null);
      loadingRef.current = true;
      setIsLoadingComments(true);

      try {
        const urlPath = post.permalink.endsWith("/")
          ? post.permalink.slice(0, -1)
          : post.permalink;
        let url = `https://www.reddit.com${urlPath}.json?raw_json=1&limit=25`;
        if (cursor) {
          url += `&after=${cursor}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        if (requestId !== requestIdRef.current) return;

        if (!Array.isArray(json) || json.length < 2) {
          if (!append) setComments([]);
          return;
        }

        const commentData = json[1];
        const nextAfter = commentData?.data?.after ?? null;
        const children = commentData?.data?.children || [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newComments = children.flatMap((c: any) => mapCommentNode(c, 0));

        afterRef.current = nextAfter;
        setCommentsAfter(nextAfter);

        setComments((prev) => (append ? [...prev, ...newComments] : newComments));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to load comments:", err);
        setError("Could not load replies right now.");
      } finally {
        if (requestId !== requestIdRef.current) return;
        loadingRef.current = false;
        setIsLoadingComments(false);
      }
    },
    [post.permalink]
  );

  useEffect(() => {
    // Initial load
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadComments(null, false);
  }, [loadComments, post.id]);

  useEffect(() => {
    observerRef.current?.disconnect();

    const root = scrollRootRef.current;
    const sentinel = sentinelRef.current;

    if (!root || !sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingRef.current &&
          afterRef.current
        ) {
          void loadComments(afterRef.current, true);
        }
      },
      { root, rootMargin: "200px" }
    );

    observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadComments, scrollRootRef]);

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
      {isLoadingComments && comments.length === 0 && (
        <div
          style={{ color: "var(--outlook-text-secondary)", fontSize: "14px" }}
        >
          Loading replies...
        </div>
      )}
      {!isLoadingComments && comments.length === 0 && !error && (
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
            whiteSpace: "pre-wrap",
          }}
        >
          {post.body}
        </div>

        {post.permalink && (
          <CommentThread
            key={post.id}
            post={post}
            scrollRootRef={readingViewRef}
          />
        )}
      </div>
    </section>
  );
}
