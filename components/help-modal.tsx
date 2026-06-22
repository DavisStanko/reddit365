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
      
      <h3 className="help-modal__subsection-title">Sorting Posts</h3>
      <p className="help-modal__p">
        Use the <strong>Hot</strong>, <strong>New</strong>, and <strong>Top</strong> tabs in the
        message list header to change how posts are sorted.
      </p>

      <h3 className="help-modal__subsection-title">Opening Posts</h3>
      <p className="help-modal__p">
        Click any post to open it in the reading pane.
        inline.
      </p>

      <h3 className="help-modal__subsection-title">Loading Replies</h3>
      <p className="help-modal__p">
        Replies (comments) are not loaded automatically. Click the <strong>Load replies</strong>{" "}
        button at the bottom of any open post to fetch them. Reddit&apos;s public feed caps replies
        at 50 and only returns a flat list.
      </p>
    </div>
  );
}

function TabPerformance() {
  return (
    <div className="help-modal__tab-content">
      <h2 className="help-modal__section-title">Performance &amp; Architecture Notes</h2>

      <h3 className="help-modal__subsection-title">Why Not the Reddit API?</h3>
      <p className="help-modal__p">
        Reddit actively blocks third-party frontends like this one from using their API. The workaround? Appending <code>.rss</code> to the subreddit URL returns a valid RSS feed. This is the only read viable read path Reddit exposes.
      </p>

      <h3 className="help-modal__subsection-title">Proxy & Caching</h3>
      <p className="help-modal__p">
        Because browsers block direct RSS fetches too (CORS), a server-side proxy fetches the feeds on your behalf. This also allows caching so Reddit is only contacted once per feed per day, no matter how many users load the same subreddit. Every RSS URL the proxy fetches is stored in Next.js&apos;s native Data Cache for{" "} <strong>24 hours</strong>. Most loads are served from cache and are nearly instant.
        The <strong>refresh button</strong> bypasses the cache to fetch live data immediately.
      </p>

      <h3 className="help-modal__subsection-title">RSS Feed Limits</h3>
      <p className="help-modal__p">
        Reddit hard-caps RSS feeds at <strong>100 posts per request</strong>. There is no way to get
        more. Reddit365 always requests the maximum in a single call — one large request is far
        friendlier to Reddit&apos;s rate limits than multiple small paginated ones.
      </p>
      <p className="help-modal__p">
        Comments have their own RSS feed, capped by Reddit at roughly <strong>50 replies</strong>{" "}
        regardless of any <code>limit=</code> parameter — Reddit silently ignores it. Comments are
        also returned as a flat list; the RSS format does not preserve thread nesting.
      </p>

      <h3 className="help-modal__subsection-title">Why Replies Need a Button</h3>
      <p className="help-modal__p">
        When a feed loads, all 100 posts arrive in one request and clicking a post costs nothing —
        the data is already in memory. Comments are different: each &ldquo;Load replies&rdquo; click
        is a brand new request to Reddit, and fetching 50 comments is roughly as expensive as the
        initial 100-post fetch. Doing it automatically on every post click would burn through
        Reddit&apos;s rate limits fast.
      </p>

      <h3 className="help-modal__subsection-title">Rate Limits &amp; Retry Logic</h3>
      <p className="help-modal__p">
        A <code>429 Too Many Requests</code> from Reddit triggers automatic retries with exponential
        backoff — the wait doubles each time, starting at 4 seconds. If Reddit sends a <code>Retry-After</code> header, that value overrides the calculated delay.
        A live countdown is shown in the UI during each wait. After 5 failed attempts, the error is
        surfaced and you can try again manually.
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
