"use client";

import { useState, ReactNode } from "react";
import { X } from "lucide-react";
import { useAppContext } from "@/components/app-context";

const R365 = () => <span style={{ color: "var(--outlook-blue)", fontWeight: 600 }}>Reddit365</span>;
const RWeb = ({ children }: { children?: ReactNode }) => <span style={{ color: "#ff4500", fontWeight: 600 }}>{children || "Reddit"}</span>;

type TabId = "using" | "performance" | "settings" | "feedback";

const TABS: { id: TabId; label: string }[] = [
  { id: "using", label: "Using Reddit365" },
  { id: "performance", label: "How Reddit365 Works" },
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
        <R365 />{" "}is a UI clone of Microsoft Outlook that displays <RWeb /> content
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
        button at the bottom of any open post to fetch them. <RWeb>Reddit&apos;s</RWeb> public feed caps replies
        at 50 and only returns a flat list.
      </p>
    </div>
  );
}

function TabPerformance() {
  return (
    <div className="help-modal__tab-content">
      <h2 className="help-modal__section-title">How Reddit365 Works</h2>
      <p className="help-modal__p help-modal__p--note">
        <RWeb />{" "}actively restricts third-party apps. <R365 /> works around these limits as best it can, but some quirks are unavoidable.
      </p>

      <h3 className="help-modal__subsection-title">Reddit Blocks API Access</h3>
      <p className="help-modal__p">
        <RWeb>Reddit&apos;s</RWeb> API is off-limits to apps like this. The workaround is appending <code>.rss</code> to a subreddit URL which returns an RSS feed. It&apos;s the only read path <RWeb /> still exposes publicly.
      </p>

      <h3 className="help-modal__subsection-title">Requests are Proxied and Cached</h3>
      <p className="help-modal__p">
        Browsers can&apos;t fetch RSS directly due to CORS restrictions, so <R365 /> uses a proxy server to fetch RSS feeds on your behalf. Posts and comments are cached so popular content loads instantly and <RWeb /> isn't contacted at all. Use the refresh button to fetch fresh content.
      </p>
      <p className="help-modal__p help-modal__p--note">
        The proxy is shared. If <RWeb /> throttles this server's IP, it affects everyone at once. The cache is the main shield against this, so please avoid using the refresh button unnecessarily.
      </p>

      <h3 className="help-modal__subsection-title">Post and Comment Limits</h3>
      <p className="help-modal__p">
        <R365 />{" "}fetches 100 posts per subreddit and 50 comments per post. The RSS format doesn&apos;t carry nesting information, so comments are displayed as a flat list.
      </p>

      <h3 className="help-modal__subsection-title">Why Comments Load on Demand</h3>
      <p className="help-modal__p">
        Each &ldquo;load replies&rdquo; click is a request to <RWeb />. Fetching 50 comments counts the same toward <RWeb>Reddit's</RWeb> rate limit as loading 100 posts.
      </p>

      <h3 className="help-modal__subsection-title">Rate Limit Errors</h3>
      <p className="help-modal__p">
        A <code>429 Too Many Requests</code> from <RWeb /> starts an automatic retry loop. The wait starts at 4 seconds and doubles with each attempt. After 5 failed attempts, the error surfaces and you can retry manually. All <R365 /> users are affected by this ratelimit.
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
