import { SAMPLE_COMMENTS } from "./sample-posts";
import type { Post, RedditComment } from "./sample-posts";

export async function getFallbackPosts(subreddit: string): Promise<Post[]> {
  const { SAMPLE_POSTS } = await import("./sample-posts");
  
  let normalized = subreddit.toLowerCase();
  if (!normalized.startsWith("r/")) {
    normalized = normalized === "frontpage" || normalized === "popular" ? "r/popular" : `r/${normalized}`;
  }

  const filtered = normalized === "r/popular" || normalized === "r/all" 
    ? SAMPLE_POSTS 
    : SAMPLE_POSTS.filter(p => p.subreddit.toLowerCase() === normalized);

  if (filtered.length > 0) return filtered;

  // Generate a mock post for subreddits without sample data
  return [
    {
      id: Math.floor(Math.random() * 1000000),
      title: `Welcome to ${normalized} (Mock Data)`,
      subreddit: normalized,
      author: "mock_user",
      time: "1m",
      score: "1",
      comments: 0,
      body: `There are no sample posts for this feed. This is generated mock data so the message list still works when Reddit is unavailable.`,
      permalink: `/${normalized}/comments/mock`,
    }
  ];
}

export async function getFallbackComments(permalink: string): Promise<RedditComment[]> {
  const { SAMPLE_COMMENTS } = await import("./sample-posts");
  // Try exact match
  if (SAMPLE_COMMENTS[permalink]) {
    return SAMPLE_COMMENTS[permalink];
  }
  // Try matching just the post ID part
  const match = permalink.match(/\/comments\/([^/]+)/);
  if (match) {
    const id = match[1];
    const key = Object.keys(SAMPLE_COMMENTS).find(k => k.includes(`/comments/${id}`));
    if (key) return SAMPLE_COMMENTS[key];
  }
  // Return first set of comments as last resort
  return Object.values(SAMPLE_COMMENTS)[0] || [];
}
