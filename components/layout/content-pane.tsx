"use client";

import { useState, useEffect } from "react";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Bookmark,
  Award,
  MoreHorizontal,
} from "lucide-react";
import type { RedditComment } from "@/lib/sample-posts";
import { useSettings } from "@/components/settings-context";
import { useAppContext } from "@/components/app-context";

function CommentNode({
  comment,
  depth = 0,
}: {
  comment: RedditComment;
  depth?: number;
}) {
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
      {comment.replies &&
        comment.replies.map((reply) => (
          <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
        ))}
    </div>
  );
}

function CommentThread({ permalink }: { permalink: string }) {
  const [comments, setComments] = useState<RedditComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/comments?permalink=${encodeURIComponent(permalink)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setComments(Array.isArray(data) ? data : []);
          setLoadingComments(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load comments:", err);
        if (isMounted) setLoadingComments(false);
      });

    return () => {
      isMounted = false;
    };
  }, [permalink]);

  return (
    <div
      className="reading-view__comments"
      style={{ marginTop: "24px", paddingBottom: "40px" }}
    >
      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
        Replies
      </h3>
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
          <CommentNode key={comment.id} comment={comment} />
        ))}
    </div>
  );
}

export function ContentPane() {
  const { mediaEnabled } = useSettings();
  const { selectedPost: post } = useAppContext();
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
      <div className="reading-view">
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
          <CommentThread key={post.permalink} permalink={post.permalink} />
        )}
      </div>
    </section>
  );
}
