"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  TrendingUp,
  Star,
  Hash,
} from "lucide-react";
import { useAppContext } from "@/components/app-context";

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

  return (
    <aside className="folder-pane" aria-label="Subreddit folders">
      <div className="folder-pane__compose">
        <button className="folder-pane__compose-btn">
          <span className="folder-pane__compose-btn-icon">+</span>
          <span>New post</span>
        </button>
      </div>

      <div className="folder-pane__content">
        <FolderGroup
          title="Favorites"
          items={FAVORITES}
          activeId={activeFeed}
          onSelect={setActiveFeed}
        />
        <FolderGroup
          title="Subscriptions"
          items={SUBSCRIBED}
          activeId={activeFeed}
          onSelect={setActiveFeed}
        />
      </div>
    </aside>
  );
}
