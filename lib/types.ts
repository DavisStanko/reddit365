export interface Post {
  id: number;
  title: string;
  subreddit: string;
  author: string;
  time: string;
  body: string;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  permalink?: string;
  externalUrl?: string;
}

export interface FlatComment {
  id: string;
  author: string;
  time: string;
  body: string;
}
