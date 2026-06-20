export interface Post {
  id: number;
  title: string;
  subreddit: string;
  author: string;
  time: string;
  body: string;
  imageUrl?: string;
  thumbnailUrl?: string; // preview thumbnail for video posts (may not load)
  mediaUrl?: string;
  mediaType?: "image" | "video";
  permalink?: string;
  externalUrl?: string;
  isGallery?: boolean;
  isVideo?: boolean;
  embedUrl?: string;
  embedType?: "youtube" | "imgur" | "streamable";
}

export interface FlatComment {
  id: string;
  author: string;
  time: string;
  body: string;
  depth: number;
  score?: number;
  /** Embeddable media extracted from the comment HTML (giphy, imgur, images, etc.) */
  mediaUrls?: import("./media-embed").DetectedMedia[];
}
