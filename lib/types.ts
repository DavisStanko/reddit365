export interface Post {
  id: number;
  title: string;
  subreddit: string;
  author: string;
  time: string;
  score: string;
  comments: number;
  body: string;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  permalink?: string;
}

export interface RedditComment {
  id: string;
  author: string;
  time: string;
  score: string;
  body: string;
  replies?: RedditComment[];
}

export interface FlatComment {
  id: string;
  author: string;
  time: string;
  score: string;
  body: string;
  depth: number;
}
