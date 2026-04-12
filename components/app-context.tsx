"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Post } from "@/lib/sample-posts";
import type { TopTimeRange } from "@/lib/reddit-api";
import { Hash } from "lucide-react";

export interface SubredditItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  unreadCount?: number;
}

const INITIAL_SUBSCRIBED: SubredditItem[] = [
  { id: "askreddit", label: "r/AskReddit", icon: Hash, unreadCount: 42 },
  { id: "worldnews", label: "r/worldnews", icon: Hash, unreadCount: 18 },
  { id: "programming", label: "r/programming", icon: Hash, unreadCount: 7 },
  { id: "technology", label: "r/technology", icon: Hash },
  { id: "science", label: "r/science", icon: Hash },
  { id: "gaming", label: "r/gaming", icon: Hash },
  { id: "movies", label: "r/movies", icon: Hash },
  { id: "music", label: "r/music", icon: Hash },
];

interface AppContextValue {
  /** Currently selected subreddit/feed id (matches FolderPane item ids) */
  activeFeed: string;
  setActiveFeed: (feed: string) => void;

  /** Currently selected post to render in the reading pane */
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;

  /** Sort mode for current feed */
  sortMode: "hot" | "new" | "top";
  setSortMode: (mode: "hot" | "new" | "top") => void;

  /** Time range used when sorting by top */
  topTimeRange: TopTimeRange;
  setTopTimeRange: (range: TopTimeRange) => void;

  subreddits: SubredditItem[];
  setSubreddits: React.Dispatch<React.SetStateAction<SubredditItem[]>>;
  addSubreddit: (name: string) => void;
  removeSubreddit: (id: string) => void;
  reorderSubreddits: (oldIndex: number, newIndex: number) => void;
}

const AppContext = createContext<AppContextValue>({
  activeFeed: "frontpage",
  setActiveFeed: () => {},
  selectedPost: null,
  setSelectedPost: () => {},
  sortMode: "hot",
  setSortMode: () => {},
  topTimeRange: "day",
  setTopTimeRange: () => {},
  subreddits: INITIAL_SUBSCRIBED,
  setSubreddits: () => {},
  addSubreddit: () => {},
  removeSubreddit: () => {},
  reorderSubreddits: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeFeed, setActiveFeedRaw] = useState<string>("frontpage");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [sortMode, setSortMode] = useState<"hot" | "new" | "top">("hot");
  const [topTimeRange, setTopTimeRange] = useState<TopTimeRange>("day");
  const [subreddits, setSubreddits] =
    useState<SubredditItem[]>(INITIAL_SUBSCRIBED);

  // When switching feeds, clear the selected post
  const setActiveFeed = useCallback((feed: string) => {
    setActiveFeedRaw(feed);
    setSelectedPost(null);
  }, []);

  const addSubreddit = useCallback(
    (name: string) => {
      const id = name.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!id || subreddits.some((s) => s.id === id)) return;
      setSubreddits((prev) => [
        { id, label: `r/${name}`, icon: Hash },
        ...prev,
      ]);
    },
    [subreddits],
  );

  const removeSubreddit = useCallback((id: string) => {
    setSubreddits((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const reorderSubreddits = useCallback(
    (oldIndex: number, newIndex: number) => {
      setSubreddits((prev) => {
        const result = Array.from(prev);
        const [removed] = result.splice(oldIndex, 1);
        result.splice(newIndex, 0, removed);
        return result;
      });
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        activeFeed,
        setActiveFeed,
        selectedPost,
        setSelectedPost,
        sortMode,
        setSortMode,
        topTimeRange,
        setTopTimeRange,
        subreddits,
        setSubreddits,
        addSubreddit,
        removeSubreddit,
        reorderSubreddits,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
