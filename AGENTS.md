<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Reddit365 — Agent Context

## Agent Prime Directive

**CRITICAL:** This document (`AGENTS.md`) is the single source of truth for the project. If you make any design, structural, or behavioral changes to the application, you **MUST** update this document to reflect those changes before completing your task. Do not let this document fall out of sync with the codebase.

## What This Project Is

**Reddit365 is a pixel-faithful UI clone of Microsoft Outlook (New Outlook / Monarch) that displays Reddit content instead of emails.**

The UI must be indistinguishable from real Outlook at a glance. Every layout decision, color, spacing, font, interaction, and animation should ask: *"Does this look exactly like New Outlook?"* If yes, ship it. If not, fix it.

> **Source of Truth:** Refer to [`outlook-reference.png`](./outlook-reference.png) for the exact visual spec of what New Outlook looks like.

The tab title is **"Outlook"** and the favicon mimics the Outlook logo. Users should feel like they are using Outlook at work while actually browsing Reddit.

---

## Design System — Fluent Design / New Outlook Exact Spec

All styles live in `app/outlook.css` (imported globally). **Never use Tailwind utility classes for layout or appearance.** Use the BEM-style class names already established.

### Color Tokens (defined in `:root`)
| Token | Value | Usage |
|---|---|---|
| `--outlook-blue` | `#0078D4` | Primary CTA, active states, links |
| `--outlook-blue-hover` | `#106EBE` | Hover on blue buttons |
| `--outlook-blue-light` | `#DEECF9` | Selected item backgrounds |
| `--outlook-sidebar-bg` | `#1F1F1F` | Icon rail background (dark) |
| `--outlook-sidebar-hover` | `#2D2D2D` | Icon rail hover |
| `--outlook-sidebar-active` | `#383838` | Icon rail active item |
| `--outlook-folder-bg` | `#F5F5F5` | Folder/subreddit pane background |
| `--outlook-content-bg` | `#FFFFFF` | Post list + reading pane |
| `--outlook-border` | `#E0E0E0` | Dividers, panel borders |
| `--outlook-text-primary` | `#242424` | Body text |
| `--outlook-text-secondary` | `#616161` | Meta text, labels |
| `--outlook-text-tertiary` | `#8A8A8A` | Timestamps, less-important info |

### Typography
- **Font**: `"Segoe UI"` → `system-ui` → `-apple-system` → `BlinkMacSystemFont` → `Roboto`
- **Base size**: `14px / 20px` line-height
- **Anti-aliasing**: `-webkit-font-smoothing: antialiased`
- All font-family declarations must use `font-family: inherit` inside components

---

## Layout Architecture

The shell is a strict flex column. **Do not alter the shell structure without a very good reason.**

```
┌─────────────────────────────────────────────────────┐
│  TopBar (height: 48px, bg: --outlook-blue)          │  ← .top-bar
├──────┬──────────────────────────────────────────────┤
│      │  Ribbon (Tabs & Commands)                    │  ← .ribbon
│ Icon ├──────────────┬──────────────┬────────────────┤
│ Rail │  Folder Pane │ Message List │  Reading Pane  │
│ 48px │  fixed:220   │ fixed:330    │  flex: 1       │
│      │  min:160     │ min:200      │  min: 0        │
│      │  max:400     │ max:600      │                │
└──────┴──────────────┴──────────────┴────────────────┘
```

- **`.outlook-shell`** — `display: flex; flex-direction: column; height: 100vh; overflow: hidden`
- **`.outlook-shell__body`** — `display: flex; flex: 1; overflow: hidden`
- **`.outlook-shell__main-area`** — Container for the Ribbon and Panes, `flex: 1; display: flex; flex-direction: column`
- **`.outlook-shell__panes`** — `display: flex; flex: 1; overflow: hidden`
- **`.outlook-shell__folder`** — **Folder Pane** (Feed selection), fixed width, `border-right`
- **`.outlook-shell__list`** — **Message List** (Post selection), fixed width, `border-right`
- **`.outlook-shell__content`** — **Reading Pane** (Post viewing), `flex: 1; min-width: 0`

### Linkification & Hover Rules
1. **Message List (Column 2)**:
   - **Nothing** inside the message list items should be clickable as an internal link (e.g., subreddit or author names).
   - The entire item is clickable to select the post, but there should be **no visual styling on hover for text** (no blue color or underline for titles).
2. **Reading Pane (Column 3)**:
   - Subject lines (Post Titles) **should** behave like a link on hover (show underline/blue color).
   - "From" (author) and "To" (subreddit) fields should look like normal text by default but show as a link on hover.
   - Body and comments **should** be linkified (URLs, r/sub, u/user).

---

## Component Map

| File / Element | Column Name | Outlook Equivalent | Notes |
|---|---|---|---|
| `/public/images/top-header.png` | N/A | Top ribbon/nav bar | Static image replacing top bar |
| `/public/images/sidebar.png` | N/A | Left nav icon strip | Static image replacing icon rail |
| `/public/images/second-header.png` | N/A | Ribbon Toolbar | Static image replacing ribbon |
| `components/layout/folder-pane.tsx` | **Folder Pane** | Folder list sidebar | Subreddits as "folders", supports DnD and editing |
| `components/layout/post-list.tsx` | **Message List** | Message list / inbox | Feed view (posts) |
| `components/layout/content-pane.tsx` | **Reading Pane** | Reading/message pane | Detail view |
| `components/help-modal.tsx` | N/A | N/A | Help & Settings modal with 4 tabs: Using Reddit365, How Reddit365 Works, Settings, Feedback. Triggered on first visit and by clicking either header image. |
| `lib/media-embed.tsx` | N/A | N/A | Modular media detection and rendering: `detectMedia()`, `extractCommentMedia()`, `MediaEmbed`, `MediaEmbedList` components |

---

## Reddit → Outlook Terminology Mapping

When building UI, always use Outlook terminology in the interface, never Reddit terminology (unless shown in post metadata):

| Reddit concept | Outlook UI label |
|---|---|
| Subreddit | "Folder" (visually), but shown as `r/name` |
| Post feed | Message list / inbox |
| Post | Message / email |
| Comments | Replies |
| Hot / New / Top | Tabs in the post list header (like Focused / Other in Outlook) |
| Saved posts | "Flagged" (conceptually) |
| r/Home feed | "Inbox" |

---

## Data Layer

The `Post` type currently has:
- `id`, `title`, `subreddit`, `author`, `time`
- `body` (text content of post, stripped from RSS HTML)
- `imageUrl?` — direct image URL (i.redd.it, preview.redd.it, or direct image link)
- `thumbnailUrl?` — preview thumbnail for **video posts only** (may be blocked, hence separate from `imageUrl`)
- `permalink?` — Reddit URL of the post
- `externalUrl?` — external link for link posts (not image/video/embed)
- `isGallery?` — Reddit gallery posts (multiple images, only first is accessible)
- `isVideo?` — v.redd.it video post; renders as 🎬 link instead of broken video
- `embedUrl?` / `embedType?` — embeddable iframe URL and type (`"youtube"` | `"imgur"` | `"streamable"`)

The `FlatComment` type has:
- `id`, `author`, `time`, `body`, `depth`
- `mediaUrls?` — array of `DetectedMedia` objects extracted from comment HTML (giphy, imgur, direct images, etc.)

The fallback sample data was completely removed. When adding real Reddit API integration, rely on the Next.js API proxy in `app/api/reddit/route.ts`.

**CRITICAL DECISION: DO NOT ATTEMPT OAUTH INTEGRATION OR .JSON API FETCHING.**
We have exhaustively tested authentication flows and determined:
- Reddit strictly limits app creation and heavily discourages frontend web apps from using OAuth.
- Client-side `fetch` to `.json` endpoints fails due to CORS.
- Server-side proxies to `.json` endpoints fail because Reddit now aggressively redirects unauthenticated `.json` requests to HTML pages, leading to `JSON.parse` errors.

**Path A: The RSS Feed Hack**
The ONLY viable path forward for a basic read-only frontend is using Reddit's public RSS feeds.
- If you append `.rss` to a subreddit URL, Reddit returns XML data of the latest posts unauthenticated.
- The Next.js API proxy (`/api/reddit/route.ts`) fetches these `.rss` feeds, and the frontend (`use-reddit.ts`) parses the XML using `DOMParser`.
- **Limitation**: This is strictly read-only and only gives you the latest feed data. It does not provide deep, nested comment trees or allow users to log in. Comments will simply return empty.
- No further attempts to bypass Cloudflare or redesign authentication for `.json` should be made.

---

## Data Fetching Behaviour

**These rules govern when and how Reddit RSS data is fetched. Follow them exactly — violating them causes rate-limit (429) errors.**

1. **One feed at a time.** Only the *currently selected* feed (subreddit + sort) is fetched. Never pre-fetch or eagerly load other feeds in the background.
2. **Initial load.** When the app mounts or the active feed changes (different subreddit, or different sort: Hot / New / Top), fetch the first page of posts immediately.
3. **No pagination.** Posts are fetched once per feed selection — one request returning up to 100 posts (the RSS hard cap). No infinite scroll or "load more" mechanism exists. Do not re-introduce pagination; the single-request approach is intentional for rate limiting.
4. **Comments on demand.** Comments are fetched *only* when the user selects a specific post. Never fetch comments speculatively or in the background. No post is auto-selected on load to avoid fetching posts and comments simultaneously, preventing rate limit bursts. Any rate limits encountered are handled by `fetchWithRetry` which implements an exponential backoff strategy on 429s (max 5 attempts) and respects the `Retry-After` header if present before surfacing an error.
5. **Server-side cache.** The API proxy (`app/api/reddit/route.ts`) uses Next.js native Data Cache via `fetch(..., { cache: "force-cache", next: { revalidate: false, tags: [...] } })` with an **indefinite TTL** (FIFO eviction managed by the Next.js/Vercel cache). This ensures the cache securely persists across Vercel serverless invocations — Reddit is only hit once per unique RSS URL, ever, until the entry is evicted or manually invalidated. Do not add a fixed TTL or switch to a custom in-memory or `fs` disk cache. Do not set `Cache-Control` headers on successful responses.
6. **No background polling.** Do not auto-refresh feeds on a timer. The user can manually refresh using the refresh button (which sends `forceRefresh=true`, causing the proxy to invalidate only that RSS URL's cache tag with `revalidateTag(tag, { expire: 0 })`, fetch fresh content, and store the replacement in the Next.js Data Cache), or by re-selecting the feed / changing the sort tab (which serves from the browser session cache when available, otherwise the server Data Cache).
7. **Backend Hardening.** The API proxy enforces an IP-based rate limit to prevent abuse and a strict 30-second timeout on upstream Reddit fetches (using `AbortSignal.timeout` or `AbortController`) to prevent hanging serverless invocations.

### RSS Limits — What Actually Matters
- **Posts per feed:** `limit=100` in the RSS URL (Reddit RSS hard cap). One request of 100 is strictly better for rate limiting than multiple small requests. The feed does **not** paginate — 100 posts is the ceiling per feed load.
- **Comments per post:** `limit=50` in the comments RSS URL. Reddit **ignores** the `limit` param for comment feeds — it always returns a fixed set regardless of the number requested. Changing this value has no effect on rate limiting or response size.

---

## Key Rules

1. **Pixel-perfect Outlook fidelity is the #1 priority.** When in doubt, look at New Outlook and match it exactly.
2. **All CSS lives in `app/outlook.css`.** No inline styles except dynamic values (e.g., `style={{ width: folderWidth }}`). No Tailwind utilities for visual styling.
3. **BEM class naming.** Block__element--modifier. Match the existing pattern exactly.
4. **`"use client"` at the top of every interactive component.** This is Next.js App Router.
5. **No `<img>` tags without the `// eslint-disable-next-line @next/next/no-img-element` comment** when using external URLs.
6. **Segoe UI everywhere.** Never deviate from the font stack.
7. **Transitions should feel Fluent:** ~120ms ease for hover states, ~200ms cubic-bezier(0.4,0,0.2,1) for animated elements.
8. **The top bar must always show "Outlook"** as the wordmark — not "Reddit365" (that's the page `<title>`). The disguise is the point.
9. **Test every change.** Use the browser MCP to verify UI output and behavior, and iterate immediately if a mistake is found.

---

## What "Done" Looks Like

A feature is complete when:
- It visually matches a screenshot of the equivalent New Outlook UI element
- It uses the correct tokens from the design system
- It follows the BEM class naming convention
- It works with keyboard navigation (focus rings, `tabIndex`, `aria-*` attributes)
- Layout structure remains intact (Resize handles are currently disabled, but act as visual separators)
- The page `<title>` remains "Outlook" and the favicon remains the Outlook icon

---

## Feature Checklist

To ensure all agents are aligned on the core feature set, here is the master list of features and their current implementation status. When adding or modifying features, please update this list:

- [x] **Post Formatting**: Posts are formatted like emails. Title is subject line, body and media in the body. External image links (e.g. `i.redd.it`) are automatically expanded into inline images. **Note:** Upvote counts and comment counts have been completely removed from the UI as they cannot be fetched via the unauthenticated `.rss` feed hack. Comments are fetched via RSS but displayed as a flat list. A link to the original post on Reddit is provided instead.
- [x] **Image Post Rendering**: Fixed RSS XML parsing to use DOM queries (not regex on entity-encoded strings) for reliable image URL extraction. Image URLs from `i.redd.it`, `preview.redd.it`, and direct image links are rendered inline.
- [x] **Video Post Rendering**: `v.redd.it` video posts are now rendered correctly — shows thumbnail (if available from RSS) and a "Watch video on Reddit" link. No longer falsely claims to provide a thumbnail when none is available.
- [x] **Post Embeds**: YouTube, Imgur (album + single), and Streamable links are auto-detected and rendered as iframes in the reading pane.
- [x] **Comment Media (Giphy & more)**: Comment HTML is parsed for embeddable media. Giphy GIFs, direct image URLs, Imgur, and Streamable links in comments are rendered inline via `lib/media-embed.tsx`. All media rendering is modular via `detectMedia()`, `extractCommentMedia()`, `MediaEmbed`, and `MediaEmbedList`.
- [x] **Media Toggle**: Two separate media embedding toggles in the Settings tab of the Help modal: one for post media (images/video/embeds in the reading pane) and one for comment media (inline embeds under replies). Both default `true` and persist to `localStorage`. Gated in `content-pane.tsx` via `mediaPostsEnabled` and `mediaCommentsEnabled` from `AppContext`. (Fully Implemented)
- [x] **Feed Sorting**: Feed should be sorted by Hot, New, and Top. Force "all time" for Top, no timeline option. No "rising" option. (Fully Implemented)
- [x] **Folder Unread Counts**: Unread counts (number of posts) beside feeds in the folder pane are explicitly NOT wanted. (Fully Implemented)
- [x] **Feed Fetching**: Implemented fetching via Reddit's public RSS feeds to bypass `.json` API blocks. Fetches one page (up to 100 posts) on feed selection. No pagination — the 100-post RSS cap is the hard ceiling by design. Comments are fetched only when a post is selected. Deep nested comment trees are not available via RSS (flat list only).
- [x] **Subreddit List Persistence & Editing**: Subreddit list persists via `localStorage` and is editable (add feed button, trash icon on row hover to delete — black by default, red on icon hover, drag and drop). (Fully Implemented)
- [x] **Help & Settings Modal**: 4-tab Fluent-style modal triggered on first visit or header click. Provides usage instructions, technical notes, limitations, media toggles, and feedback link. (Fully Implemented)
- [ ] **Background Fetching**: Periodically fetch new Reddit posts to keep the feed current. (Explicitly disabled to prevent rate limiting, per rule 6)
