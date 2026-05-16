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
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const INITIAL_SUBSCRIBED: SubredditItem[] = [
  { id: "askreddit", label: "r/AskReddit", icon: Hash },
  { id: "worldnews", label: "r/worldnews", icon: Hash },
  { id: "programming", label: "r/programming", icon: Hash },
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
  currentSort: SortMode;
  setCurrentSort: (mode: SortMode) => void;

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
  currentSort: "hot",
  setCurrentSort: () => {},
  subreddits: INITIAL_SUBSCRIBED,
  setSubreddits: () => {},
  addSubreddit: () => {},
  removeSubreddit: () => {},
  reorderSubreddits: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeFeed, setActiveFeedRaw] = useState<string>("frontpage");
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
          const restored = parsed.map((item: any) => ({
            ...item,
            icon: Hash,
          }));
          setSubredditsRaw(restored);
        }
      }
    } catch (e) {
      console.error("Failed to load subscriptions", e);
    }
  }, []);

  const setSubreddits = useCallback(
    (valOrFn: React.SetStateAction<SubredditItem[]>) => {
      setSubredditsRaw((prev) => {
        const next =
          typeof valOrFn === "function" ? (valOrFn as Function)(prev) : valOrFn;
        try {
          const toSave = next.map(({ icon, ...rest }: SubredditItem) => rest);
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
    []
  );

  // When switching feeds, clear the selected post
  const setActiveFeed = useCallback((feed: string) => {
    setActiveFeedRaw(feed);
    setSelectedPost(null);
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
