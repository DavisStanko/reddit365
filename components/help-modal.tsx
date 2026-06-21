"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppContext } from "@/components/app-context";

type TabId = "using" | "performance" | "settings" | "feedback";

const TABS: { id: TabId; label: string }[] = [
  { id: "using", label: "Using Reddit365" },
  { id: "performance", label: "Performance Notes" },
  { id: "settings", label: "Settings" },
  { id: "feedback", label: "Feedback" },
];

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`settings-toggle${checked ? " settings-toggle--on" : ""}`}
      type="button"
    >
      <span className="settings-toggle__thumb" />
    </button>
  );
}

function TabUsing() {
  return (
    <div className="help-modal__tab-content">
      <h2 className="help-modal__section-title">Welcome to Reddit365</h2>
      <p className="help-modal__p">
        Reddit365 is a UI clone of Microsoft Outlook that displays Reddit content
        in place of emails. Click anywhere on the Outlook header to reopen this help panel later.
      </p>

      <h3 className="help-modal__subsection-title">Navigating Subreddits</h3>
      <p className="help-modal__p">
        The left sidebar lists your subscribed subreddits. Click any
        subreddit to load its posts.
      </p>
      <ul className="help-modal__list">
        <li>
          <strong>Add a subreddit</strong> — Click <em>add feed</em> at the bottom
          of the sidebar and enter a subreddit name.
        </li>
        <li>
          <strong>Remove a subreddit</strong> — Hover over any subreddit row and click the{" "}
          <em>trash icon</em> to delete it.
        </li>
        <li>
          <strong>Reorder subreddits</strong> — Drag and drop rows in the folder pane to reorder
          them.
        </li>
      </ul>

      <h3 className="help-modal__subsection-title">Opening Posts</h3>
      <p className="help-modal__p">
        Click any post in the middle column (the &ldquo;Message List&rdquo;) to open it in the
        reading pane on the right. The post title, body, media, and external links will all render
        inline.
      </p>

      <h3 className="help-modal__subsection-title">Sorting Posts</h3>
      <p className="help-modal__p">
        Use the <strong>Hot</strong>, <strong>New</strong>, and <strong>Top</strong> tabs in the
        message list header to change how posts are sorted. <em>Top</em> always shows all-time top
        posts.
      </p>

      <h3 className="help-modal__subsection-title">Loading Replies</h3>
      <p className="help-modal__p">
        Replies (comments) are not loaded automatically — click the <strong>Load replies</strong>{" "}
        button at the bottom of any open post to fetch them. Reddit&apos;s public feed caps replies
        at 50 and only returns a flat list — nested threads are not available without authentication.
        A link to the full Reddit thread is always provided.
      </p>

      <h3 className="help-modal__subsection-title">Loading More Posts</h3>
      <p className="help-modal__p">
        Scroll to the bottom of the message list to automatically load the next page of posts
        (up to 100 per page). A <em>Load more</em> button appears if automatic loading doesn&apos;t
        trigger.
      </p>
    </div>
  );
}

function TabPerformance() {
  return (
    <div className="help-modal__tab-content">
      <h2 className="help-modal__section-title">Performance &amp; Architecture Notes</h2>
      <p className="help-modal__p help-modal__p--secondary">
        This section is intentionally technical. It explains the engineering decisions behind
        Reddit365 and why certain limitations exist.
      </p>

      <h3 className="help-modal__subsection-title">Why Not the Reddit API?</h3>
      <p className="help-modal__p">
        Reddit&apos;s official API requires OAuth 2.0 authentication. Setting up OAuth for a
        public-facing web app is blocked by Reddit&apos;s current app creation policies — they
        heavily restrict new third-party app registrations. Client-side <code>fetch</code> to{" "}
        <code>.json</code> endpoints fails immediately due to CORS. Server-side proxy requests to
        those same endpoints also fail because Reddit now redirects unauthenticated{" "}
        <code>.json</code> requests to HTML login pages, causing JSON parse errors. Every possible
        avenue was exhaustively tested.
      </p>

      <h3 className="help-modal__subsection-title">The RSS Hack</h3>
      <p className="help-modal__p">
        The only viable unauthenticated, read-only path is Reddit&apos;s public RSS feeds. Appending{" "}
        <code>.rss</code> to any subreddit URL returns valid XML without authentication. A Next.js
        server-side API proxy (<code>/api/reddit/route.ts</code>) fetches these feeds, and the
        client parses the XML using the browser&apos;s built-in <code>DOMParser</code>.
      </p>
      <p className="help-modal__p">
        <strong>Post limit:</strong> Reddit RSS hard-caps at 100 posts per request. One request of
        100 is strictly better for rate limiting than multiple small requests. Infinite scroll only
        triggers a second request when you actually scroll past 100 posts.
      </p>
      <p className="help-modal__p">
        <strong>Comment limit:</strong> The comment RSS feed is hard-capped at 50 replies by Reddit
        regardless of any <code>limit</code> parameter — changing it has zero effect. Comments are
        always flat (no nested threads).
      </p>

      <h3 className="help-modal__subsection-title">Server-Side Caching</h3>
      <p className="help-modal__p">
        The API proxy uses Next.js&apos;s native Data Cache with a <strong>24-hour TTL</strong>.
        This means Reddit&apos;s servers are only hit once per unique URL per day, regardless of how
        many users visit Reddit365. The cache is shared across all serverless invocations on Vercel.
        Manual refresh (via the refresh button in the post list header) bypasses the cache and
        fetches fresh data immediately.
      </p>

      <h3 className="help-modal__subsection-title">Rate Limiting &amp; Retry Logic</h3>
      <p className="help-modal__p">
        Reddit enforces aggressive rate limits. If the proxy receives a <code>429 Too Many
          Requests</code> response, it implements an exponential backoff strategy: up to 5 retry
        attempts, with each delay doubling. The <code>Retry-After</code> header is honoured if
        present. An IP-based rate limit guard is also built into the proxy to prevent individual
        users from hammering Reddit. If you see a rate-limit warning in the UI, this is
        Reddit&apos;s infrastructure throttling the request — not a bug in Reddit365.
      </p>

      <h3 className="help-modal__subsection-title">Media Limitations</h3>
      <p className="help-modal__p">
        Images hosted on <code>i.redd.it</code> and <code>preview.redd.it</code> render inline.
        Native Reddit videos (<code>v.redd.it</code>) are inaccessible without OAuth — the HLS
        stream is gated behind authentication. Reddit365 shows the thumbnail (if available via RSS)
        and provides a &ldquo;Watch video on Reddit&rdquo; link instead. Gallery posts only expose
        the first image through the RSS feed. YouTube, Imgur, Streamable, and Giphy embeds are
        detected and rendered as iframes where supported.
      </p>

      <h3 className="help-modal__subsection-title">Occasional Delays</h3>
      <p className="help-modal__p">
        Vercel serverless functions have a cold-start penalty when they haven&apos;t been invoked
        recently. This can add 1–3 seconds to the first load. The proxy enforces a strict 30-second
        upstream timeout to prevent hanging invocations. Once warmed up (or cache-hit), responses
        are nearly instant.
      </p>
    </div>
  );
}

function TabSettings() {
  const { mediaPostsEnabled, setMediaPostsEnabled, mediaCommentsEnabled, setMediaCommentsEnabled } =
    useAppContext();

  return (
    <div className="help-modal__tab-content">
      <h2 className="help-modal__section-title">Settings</h2>

      <div className="help-modal__setting-group">

        <div className="help-modal__setting-row">
          <div className="help-modal__setting-label">
            <span className="help-modal__setting-name">Embed media in posts</span>
            <span className="help-modal__setting-desc">
              Show images, videos, and embeds (YouTube, Imgur, Streamable) in the reading pane.
            </span>
          </div>
          <Toggle
            id="setting-media-posts"
            checked={mediaPostsEnabled}
            onChange={setMediaPostsEnabled}
          />
        </div>

        <div className="help-modal__setting-row">
          <div className="help-modal__setting-label">
            <span className="help-modal__setting-name">Embed media in comments</span>
            <span className="help-modal__setting-desc">
              Render inline media (GIFs, images, embeds) found in reply content.
            </span>
          </div>
          <Toggle
            id="setting-media-comments"
            checked={mediaCommentsEnabled}
            onChange={setMediaCommentsEnabled}
          />
        </div>
      </div>
    </div>
  );
}

function TabFeedback() {
  return (
    <div className="help-modal__tab-content">
      <h2 className="help-modal__section-title">Feedback</h2>
      <p className="help-modal__p">
        If you&apos;ve found a bug or have a feature request, please send an email to:
      </p>
      <a
        href="mailto:davis@davisstanko.com"
        className="help-modal__email-link"
        id="feedback-email-link"
      >
        davis@davisstanko.com
      </a>
    </div>
  );
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("using");

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="help-modal__overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Reddit365 Help"
    >
      <div className="help-modal__dialog" role="document">
        {/* Header */}
        <div className="help-modal__header">
          <div className="help-modal__header-icon" aria-hidden="true">?</div>
          <h1 className="help-modal__title">Reddit365 Help &amp; Settings</h1>
          <button
            className="help-modal__close"
            onClick={onClose}
            aria-label="Close help modal"
            id="help-modal-close"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="help-modal__tab-bar" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`help-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`help-panel-${tab.id}`}
              className={`help-modal__tab${activeTab === tab.id ? " help-modal__tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          className="help-modal__body"
          id={`help-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`help-tab-${activeTab}`}
        >
          {activeTab === "using" && <TabUsing />}
          {activeTab === "performance" && <TabPerformance />}
          {activeTab === "settings" && <TabSettings />}
          {activeTab === "feedback" && <TabFeedback />}
        </div>
      </div>
    </div>
  );
}
