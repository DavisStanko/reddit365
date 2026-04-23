"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Star,
  Flame,
  Globe,
  Hash,
  TrendingUp,
} from "lucide-react";

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
        <ul className="folder-group__list" role="tree">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <li key={item.id} role="treeitem">
                <button
                  className={`folder-item ${isActive ? "folder-item--active" : ""}`}
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={16} className="folder-item__icon" />
                  <span className="folder-item__label">{item.label}</span>
                  {item.unreadCount && (
                    <span className="folder-item__badge">{item.unreadCount}</span>
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
  const [activeId, setActiveId] = useState<string>("all");

  return (
    <aside className="folder-pane" aria-label="Subreddit folders">
      {/* Compose-style button */}
      <div className="folder-pane__compose">
        <button className="folder-pane__compose-btn">
          <Flame size={16} />
          <span>New Post</span>
        </button>
      </div>

      <div className="folder-pane__content">
        <FolderGroup
          title="Favorites"
          items={FAVORITES}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <FolderGroup
          title="Subscriptions"
          items={SUBSCRIBED}
          activeId={activeId}
          onSelect={setActiveId}
        />
      </div>
    </aside>
  );
}
