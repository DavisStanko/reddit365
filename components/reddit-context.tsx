"use client";

import {
  createContext,
  useContext,
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
  const { activeFeed, currentSort, selectedPost } = useAppContext();

  const reddit = useReddit(
    activeFeed,
    currentSort,
    selectedPost,
  );

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
