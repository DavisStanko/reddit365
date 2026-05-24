"use client";

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { useAppContext } from "@/components/app-context";
import { useReddit, type UseRedditReturn } from "@/lib/use-reddit";

const RedditContext = createContext<UseRedditReturn | null>(null);

/**
 * Single shared instance of the useReddit hook.
 * Reads feed/sort/timeframe/selectedPost from AppContext
 * and exposes all fetched state to children.
 */
export function RedditProvider({ children }: { children: ReactNode }) {
  const { activeFeed, currentSort, selectedPost, setSelectedPost } =
    useAppContext();

  const reddit = useReddit(
    activeFeed,
    currentSort,
    selectedPost,
  );

  const { posts, isLoadingPosts } = reddit;

  // Auto-select first post on load if none selected and not loading.
  // Delayed 5s to avoid bursting Reddit's rate limit with posts + comments
  // requests firing simultaneously on page load.
  useEffect(() => {
    if (isLoadingPosts || selectedPost || posts.length === 0) return;
    const timer = setTimeout(() => {
      setSelectedPost(posts[0]);
    }, 5000);
    return () => clearTimeout(timer);
  }, [posts, selectedPost, setSelectedPost, isLoadingPosts]);


  return (
    <RedditContext.Provider value={reddit}>
      {children}
    </RedditContext.Provider>
  );
}

export function useRedditContext(): UseRedditReturn {
  const ctx = useContext(RedditContext);
  if (!ctx) {
    throw new Error("useRedditContext must be used within a RedditProvider");
  }
  return ctx;
}
