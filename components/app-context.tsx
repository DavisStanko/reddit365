"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Post } from "@/lib/types";
import type { SortMode } from "@/lib/use-reddit";
import { Hash } from "lucide-react";

export interface SubredditItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const INITIAL_SUBSCRIBED: SubredditItem[] = [
  { id: "askreddit", label: "AskReddit", icon: Hash },
  { id: "worldnews", label: "worldnews", icon: Hash },
  { id: "programming", label: "programming", icon: Hash },
  { id: "technology", label: "technology", icon: Hash },
  { id: "science", label: "science", icon: Hash },
  { id: "gaming", label: "gaming", icon: Hash },
  { id: "movies", label: "movies", icon: Hash },
  { id: "music", label: "music", icon: Hash },
];



interface AppContextValue {
  /** Currently selected subreddit/feed id (matches FolderPane item ids) */
  activeFeed: string;
  setActiveFeed: (feed: string) => void;

  /** Currently selected post to render in the reading pane */
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;

  /** Sort mode for current feed */
  currentSort: SortMode;
  setCurrentSort: (mode: SortMode) => void;

  subreddits: SubredditItem[];
  setSubreddits: React.Dispatch<React.SetStateAction<SubredditItem[]>>;
  addSubreddit: (name: string) => void;
  removeSubreddit: (id: string) => void;
  reorderSubreddits: (oldIndex: number, newIndex: number) => void;
}

const AppContext = createContext<AppContextValue>({
  activeFeed: "popular",
  setActiveFeed: () => {},
  selectedPost: null,
  setSelectedPost: () => {},
  currentSort: "hot",
  setCurrentSort: () => {},
  subreddits: INITIAL_SUBSCRIBED,
  setSubreddits: () => {},
  addSubreddit: () => {},
  removeSubreddit: () => {},
  reorderSubreddits: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeFeed, setActiveFeedRaw] = useState<string>("popular");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentSort, setCurrentSortRaw] = useState<SortMode>("hot");
  const [subreddits, setSubredditsRaw] =
    useState<SubredditItem[]>(INITIAL_SUBSCRIBED);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("reddit365_subscriptions");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const restored = (parsed as Omit<SubredditItem, "icon">[]).map((item) => ({
            ...item,
            icon: Hash,
          }));
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSubredditsRaw(restored);
        }
      }
    } catch (e) {
      console.error("Failed to load subscriptions", e);
    }

    try {
      const storedFeed = localStorage.getItem("reddit365_activeFeed");
      if (storedFeed) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveFeedRaw(storedFeed);
      }
    } catch (e) {
      console.error("Failed to load active feed", e);
    }
  }, []);

  const setSubreddits = useCallback(
    (valOrFn: React.SetStateAction<SubredditItem[]>) => {
      setSubredditsRaw((prev) => {
        const next =
          typeof valOrFn === "function" ? (valOrFn as (prev: SubredditItem[]) => SubredditItem[])(prev) : valOrFn;
        try {
          const toSave = next.map((item: SubredditItem) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { icon: _, ...rest } = item;
            return rest;
          });
          localStorage.setItem(
            "reddit365_subscriptions",
            JSON.stringify(toSave)
          );
        } catch (e) {
          console.error("Failed to save subscriptions", e);
        }
        return next;
      });
    },
    [setSubredditsRaw]
  );

  // When switching feeds, clear the selected post
  const setActiveFeed = useCallback((feed: string) => {
    setActiveFeedRaw(feed);
    setSelectedPost(null);
    try {
      localStorage.setItem("reddit365_activeFeed", feed);
    } catch (e) {
      console.error("Failed to save active feed", e);
    }
  }, []);

  const setCurrentSort = useCallback((mode: SortMode) => {
    setCurrentSortRaw(mode);
    setSelectedPost(null);
  }, []);

  const addSubreddit = useCallback(
    (name: string) => {
      const id = name.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!id || subreddits.some((s) => s.id === id)) return;
      setSubreddits((prev) => [
        ...prev,
        { id, label: name, icon: Hash },
      ]);
    },
    [subreddits, setSubreddits],
  );

  const removeSubreddit = useCallback((id: string) => {
    setSubreddits((prev) => prev.filter((s) => s.id !== id));
  }, [setSubreddits]);

  const reorderSubreddits = useCallback(
    (oldIndex: number, newIndex: number) => {
      setSubreddits((prev) => {
        const result = Array.from(prev);
        const [removed] = result.splice(oldIndex, 1);
        result.splice(newIndex, 0, removed);
        return result;
      });
    },
    [setSubreddits],
  );

  return (
    <AppContext.Provider
      value={{
        activeFeed,
        setActiveFeed,
        selectedPost,
        setSelectedPost,
        currentSort,
        setCurrentSort,
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
