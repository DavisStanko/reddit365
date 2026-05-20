import React from "react";

/**
 * Linkifies URLs, subreddits (r/name), and users (u/name) in a string.
 * Returns an array of strings and React elements.
 */
export function linkifyText(text: string): React.ReactNode {
  if (!text) return null;

  // Regexes
  // URL: https?://...
  const urlRegex = /https?:\/\/[^\s<>\uff01-\uffee]+/gi;
  // Subreddit: r/name or /r/name (look for r/ or /r/ preceded by non-word char or start of string)
  const subRegex = /(^|[^\w])\/?r\/[a-zA-Z0-9_]+/gi;
  // User: u/name or /u/name
  const userRegex = /(^|[^\w])\/?u\/[a-zA-Z0-9_-]+/gi;

  // Combine and sort matches
  const matches: { start: number; end: number; type: "url" | "sub" | "user"; value: string; fullMatch: string }[] = [];
  
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    matches.push({ start: match.index, end: urlRegex.lastIndex, type: "url", value: match[0], fullMatch: match[0] });
  }
  while ((match = subRegex.exec(text)) !== null) {
    // If there's a leading non-word char, adjust start and value
    const prefix = match[1];
    const actualMatch = match[0].slice(prefix.length);
    matches.push({ 
      start: match.index + prefix.length, 
      end: subRegex.lastIndex, 
      type: "sub", 
      value: actualMatch,
      fullMatch: match[0]
    });
  }
  while ((match = userRegex.exec(text)) !== null) {
    const prefix = match[1];
    const actualMatch = match[0].slice(prefix.length);
    matches.push({ 
      start: match.index + prefix.length, 
      end: userRegex.lastIndex, 
      type: "user", 
      value: actualMatch,
      fullMatch: match[0]
    });
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches
  const nonOverlappingMatches: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlappingMatches.push(m);
      lastEnd = m.end;
    }
  }

  if (nonOverlappingMatches.length === 0) return text;

  const result: (string | React.ReactElement)[] = [];
  lastEnd = 0;

  nonOverlappingMatches.forEach((m, idx) => {
    // Add text before the match
    if (m.start > lastEnd) {
      result.push(text.slice(lastEnd, m.start));
    }

    // Add the linkified element
    if (m.type === "url") {
      result.push(
        <a 
          key={`link-${idx}`} 
          href={m.value} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="outlook-link"
          onClick={(e) => e.stopPropagation()}
        >
          {m.value}
        </a>
      );
    } else if (m.type === "sub") {
      const subName = m.value.startsWith("/") ? m.value.slice(1) : m.value;
      result.push(
        <a 
          key={`sub-${idx}`} 
          href={`https://reddit.com/${subName}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="outlook-link"
          onClick={(e) => e.stopPropagation()}
        >
          {m.value}
        </a>
      );
    } else if (m.type === "user") {
      const userName = m.value.startsWith("/") ? m.value.slice(1) : m.value;
      result.push(
        <a 
          key={`user-${idx}`} 
          href={`https://reddit.com/${userName}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="outlook-link"
          onClick={(e) => e.stopPropagation()}
        >
          {m.value}
        </a>
      );
    }

    lastEnd = m.end;
  });

  // Add remaining text
  if (lastEnd < text.length) {
    result.push(text.slice(lastEnd));
  }

  return <>{result}</>;
}
