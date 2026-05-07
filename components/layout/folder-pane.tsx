"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  TrendingUp,
  Star,
  Hash,
} from "lucide-react";
import { useAppContext } from "@/components/app-context";
import type { SubredditListing } from "@/lib/reddit-api";

interface SubredditItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  unreadCount?: number;
}

const FAVORITES: SubredditItem[] = [
  { id: "all", label: "r/all", icon: Globe },
  { id: "popular", label: "r/popular", icon: TrendingUp },
  { id: "frontpage", label: "Front Page", icon: Star },
];

const SUBSCRIBED: SubredditItem[] = [
  { id: "askreddit", label: "r/AskReddit", icon: Hash, unreadCount: 42 },
  { id: "worldnews", label: "r/worldnews", icon: Hash, unreadCount: 18 },
  { id: "programming", label: "r/programming", icon: Hash, unreadCount: 7 },
  { id: "technology", label: "r/technology", icon: Hash },
  { id: "science", label: "r/science", icon: Hash },
  { id: "gaming", label: "r/gaming", icon: Hash },
  { id: "movies", label: "r/movies", icon: Hash },
  { id: "music", label: "r/music", icon: Hash },
];

const INITIAL_SUBSCRIBED = SUBSCRIBED;

function toSubredditItem(item: SubredditListing): SubredditItem {
  return {
    id: item.id,
    label: item.label,
    icon: Hash,
  };
}

function mergeSubreddits(
  current: SubredditItem[],
  nextItems: SubredditItem[],
): SubredditItem[] {
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];

  for (const item of nextItems) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

interface FolderGroupProps {
  title: string;
  items: SubredditItem[];
  activeId: string;
  onSelect: (id: string) => void;
  defaultExpanded?: boolean;
}

function FolderGroup({
  title,
  items,
  activeId,
  onSelect,
  defaultExpanded = true,
}: FolderGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="folder-group">
      <button
        className="folder-group__header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown size={12} className="folder-group__chevron" />
        ) : (
          <ChevronRight size={12} className="folder-group__chevron" />
        )}
        <span className="folder-group__title">{title}</span>
      </button>
      {expanded && (
        <ul className="folder-group__list">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`folder-item ${isActive ? "folder-item--active" : ""}`}
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={16} className="folder-item__icon" />
                  <span className="folder-item__label">{item.label}</span>
                  {item.unreadCount && (
                    <span className="folder-item__badge">
                      {item.unreadCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function FolderPane() {
  const { activeFeed, setActiveFeed } = useAppContext();
  const [subreddits, setSubreddits] =
    useState<SubredditItem[]>(INITIAL_SUBSCRIBED);
  const [loading, setLoading] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const afterRef = useRef<string | null>(null);

  const loadSubreddits = useCallback(async (afterToken: string | null) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (afterToken) params.set("after", afterToken);

      const response = await fetch(`/api/subreddits?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as {
        subreddits?: SubredditListing[];
        after?: string | null;
      };

      const nextItems = (data.subreddits ?? []).map(toSubredditItem);
      afterRef.current = data.after ?? null;
      setSubreddits((current) => mergeSubreddits(current, nextItems));
    } catch (error) {
      console.error("[FolderPane]", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadSubreddits(null);
    });
  }, [loadSubreddits]);

  useEffect(() => {
    observerRef.current?.disconnect();

    const root = contentRef.current;
    if (!root) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingRef.current &&
          afterRef.current
        ) {
          void loadSubreddits(afterRef.current);
        }
      },
      { root, rootMargin: "200px" },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadSubreddits]);

  return (
    <aside className="folder-pane" aria-label="Subreddit folders">
      <div className="folder-pane__content" ref={contentRef}>
        <FolderGroup
          title="Favorites"
          items={FAVORITES}
          activeId={activeFeed}
          onSelect={setActiveFeed}
        />
        <FolderGroup
          title="Subscriptions"
          items={subreddits}
          activeId={activeFeed}
          onSelect={setActiveFeed}
        />
        <div
          ref={sentinelRef}
          className="folder-pane__sentinel"
          aria-hidden="true"
        />
        {loading && <div className="folder-pane__loading" aria-hidden="true" />}
      </div>
    </aside>
  );
}
