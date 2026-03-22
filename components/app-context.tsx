"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Post } from "@/lib/sample-posts";

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
}

const AppContext = createContext<AppContextValue>({
  activeFeed: "frontpage",
  setActiveFeed: () => {},
  selectedPost: null,
  setSelectedPost: () => {},
  sortMode: "hot",
  setSortMode: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeFeed, setActiveFeedRaw] = useState<string>("frontpage");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [sortMode, setSortMode] = useState<"hot" | "new" | "top">("hot");

  // When switching feeds, clear the selected post
  const setActiveFeed = useCallback((feed: string) => {
    setActiveFeedRaw(feed);
    setSelectedPost(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeFeed,
        setActiveFeed,
        selectedPost,
        setSelectedPost,
        sortMode,
        setSortMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
