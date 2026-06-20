"use client";

import React from "react";

// ---------------------------------------------------------------------------
// Media URL Detection Utilities
// ---------------------------------------------------------------------------

/** Domains/patterns for images that can be embedded directly as <img> */
const DIRECT_IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i;

const DIRECT_IMAGE_HOSTS = [
  "i.redd.it",
  "i.imgur.com",
  "preview.redd.it",
  "external-preview.redd.it",
  "i.giphy.com",
  "media.giphy.com",
  "media0.giphy.com",
  "media1.giphy.com",
  "media2.giphy.com",
  "media3.giphy.com",
  "media4.giphy.com",
];

export type DetectedMedia =
  | { type: "image"; url: string }
  | { type: "giphy-embed"; giphyId: string }
  | { type: "youtube"; videoId: string }
  | { type: "imgur-album"; albumId: string }
  | { type: "imgur-image"; imageId: string }
  | { type: "streamable"; videoId: string };

/**
 * Detect what kind of embeddable media a URL represents.
 * Returns null if the URL is not embeddable.
 */
export function detectMedia(url: string): DetectedMedia | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  // Direct image by extension or known image host
  if (DIRECT_IMAGE_EXTENSIONS.test(parsed.pathname)) {
    if (DIRECT_IMAGE_HOSTS.some((h) => parsed.hostname.endsWith(h))) {
      return { type: "image", url };
    }
  }

  // Giphy embed (media.giphy.com/media/<id>/giphy.gif  or  giphy.com/gifs/<slug-id>)
  if (host === "giphy.com") {
    const gifMatch = parsed.pathname.match(/\/gifs\/(?:[^/]+-)?([a-zA-Z0-9]+)$/);
    if (gifMatch) return { type: "giphy-embed", giphyId: gifMatch[1] };
    const mediaMatch = parsed.pathname.match(/\/media\/([a-zA-Z0-9]+)\//);
    if (mediaMatch) return { type: "giphy-embed", giphyId: mediaMatch[1] };
  }
  if (host.endsWith("giphy.com") && DIRECT_IMAGE_EXTENSIONS.test(parsed.pathname)) {
    // Direct giphy CDN image — render as <img>
    return { type: "image", url };
  }

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = parsed.searchParams.get("v");
    if (v) return { type: "youtube", videoId: v };
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("?")[0];
    if (id) return { type: "youtube", videoId: id };
  }

  // Imgur album
  if (host === "imgur.com") {
    const albumMatch = parsed.pathname.match(/^\/(?:a|gallery)\/([^/?#]+)/);
    if (albumMatch) return { type: "imgur-album", albumId: albumMatch[1] };
    // Single image page (no extension)
    const singleMatch = parsed.pathname.match(/^\/([a-zA-Z0-9]+)$/);
    if (singleMatch) return { type: "imgur-image", imageId: singleMatch[1] };
  }
  // i.imgur.com direct image
  if (host === "i.imgur.com") {
    return { type: "image", url };
  }

  // Streamable
  if (host === "streamable.com") {
    const videoMatch = parsed.pathname.match(/^\/([a-zA-Z0-9]+)$/);
    if (videoMatch) return { type: "streamable", videoId: videoMatch[1] };
  }

  return null;
}

/**
 * Given a comment's raw HTML content, extract all embeddable media URLs.
 * Returns an array of DetectedMedia objects.
 */
export function extractCommentMedia(htmlContent: string): DetectedMedia[] {
  if (typeof document === "undefined") return [];

  const tmp = document.createElement("div");
  tmp.innerHTML = htmlContent;

  const found: DetectedMedia[] = [];
  const seen = new Set<string>();

  // Check all anchor hrefs
  tmp.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") || a.href;
    if (!href || seen.has(href)) return;
    const media = detectMedia(href);
    if (media) {
      seen.add(href);
      found.push(media);
    }
  });

  // Check all img srcs
  tmp.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || img.src;
    if (!src || seen.has(src)) return;
    const media = detectMedia(src);
    if (media) {
      seen.add(src);
      found.push(media);
    }
  });

  // Scan text content for bare URLs (Giphy in comments often appears as plain text)
  const text = tmp.textContent || "";
  const urlPattern = /https?:\/\/(?:(?:www\.)?giphy\.com|(?:media\d*\.)?giphy\.com|streamable\.com)\/[^\s<>]+/gi;
  let m;
  while ((m = urlPattern.exec(text)) !== null) {
    const href = m[0].replace(/[.)]+$/, ""); // trim trailing punctuation
    if (seen.has(href)) continue;
    const media = detectMedia(href);
    if (media) {
      seen.add(href);
      found.push(media);
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// React Components
// ---------------------------------------------------------------------------

interface MediaEmbedProps {
  media: DetectedMedia;
  className?: string;
}

/**
 * Renders a single detected media item.
 * Keep this modular — parent components pass in DetectedMedia objects.
 */
export function MediaEmbed({ media, className }: MediaEmbedProps) {
  switch (media.type) {
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt=""
          className={className}
          style={{ display: "block", maxWidth: "480px", width: "100%", borderRadius: "4px" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          loading="lazy"
        />
      );

    case "giphy-embed":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://media.giphy.com/media/${media.giphyId}/giphy.gif`}
          alt="GIF"
          className={className}
          style={{
            display: "block",
            maxWidth: "480px",
            width: "100%",
            maxHeight: "400px",
            borderRadius: "4px",
            objectFit: "contain",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          loading="lazy"
        />
      );

    case "youtube":
      return (
        <iframe
          src={`https://www.youtube.com/embed/${media.videoId}`}
          width="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={className}
          style={{ borderRadius: "4px", backgroundColor: "#000", aspectRatio: "16/9", maxWidth: "480px", height: "auto" }}
          title="YouTube video"
        />
      );

    case "imgur-album":
      return (
        <iframe
          src={`https://imgur.com/a/${media.albumId}/embed?pub=true`}
          width="100%"
          height="550"
          frameBorder="0"
          allowFullScreen
          className={className}
          style={{ borderRadius: "4px", maxWidth: "480px" }}
          title="Imgur album"
        />
      );

    case "imgur-image":
      return (
        <iframe
          src={`https://imgur.com/${media.imageId}/embed?pub=true`}
          width="100%"
          height="450"
          frameBorder="0"
          allowFullScreen
          className={className}
          style={{ borderRadius: "4px", maxWidth: "480px" }}
          title="Imgur image"
        />
      );

    case "streamable":
      return (
        <iframe
          src={`https://streamable.com/e/${media.videoId}`}
          width="100%"
          frameBorder="0"
          allowFullScreen
          allow="autoplay"
          className={className}
          style={{ borderRadius: "4px", backgroundColor: "#000", aspectRatio: "16/9", maxWidth: "480px", height: "auto" }}
          title="Streamable video"
        />
      );

    default:
      return null;
  }
}

/**
 * Renders a list of media embeds.
 */
export function MediaEmbedList({
  mediaList,
  style,
}: {
  mediaList: DetectedMedia[];
  style?: React.CSSProperties;
}) {
  if (!mediaList.length) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginTop: "8px",
        ...style,
      }}
    >
      {mediaList.map((media, idx) => (
        <MediaEmbed key={idx} media={media} />
      ))}
    </div>
  );
}
