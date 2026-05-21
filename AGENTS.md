<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Reddit365 — Agent Context

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
├──────┬──────────────┬──────────────┬────────────────┤
│      │              │              │                │
│ Icon │  Folder Pane │ Message List │  Reading Pane  │
│ Rail │  (resizable) │ (resizable)  │  (flex: 1)     │
│ 48px │  default:220 │ default:340  │                │
│      │  min:160     │ min:200      │                │
│      │  max:400     │ max:600      │                │
└──────┴──────────────┴──────────────┴────────────────┘
```

- **`.outlook-shell`** — `display: flex; flex-direction: column; height: 100vh; overflow: hidden`
- **`.outlook-shell__body`** — `display: flex; flex: 1; overflow: hidden`
- **`.outlook-shell__folder`** — **Folder Pane** (Feed selection), fixed width, `border-right`
- **`.outlook-shell__list`** — **Message List** (Post selection), fixed width, `border-right`
- **`.outlook-shell__content`** — **Reading Pane** (Post viewing), `flex: 1; min-width: 0`
- Between each resizable pane: a `<ResizeHandle>` component

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

| File | Column Name | Outlook Equivalent | Notes |
|---|---|---|---|
| `components/layout/top-bar.tsx` | N/A | Top ribbon/nav bar | Blue bg, wordmark, search, avatar |
| `components/layout/icon-rail.tsx` | N/A | Left nav icon strip | Dark bg, 48px wide |
| `components/layout/folder-pane.tsx` | **Folder Pane** | Folder list sidebar | Subreddits as "folders" |
| `components/layout/post-list.tsx` | **Message List** | Message list / inbox | Feed view (posts) |
| `components/layout/content-pane.tsx` | **Reading Pane** | Reading/message pane | Detail view |

---

## Reddit → Outlook Terminology Mapping

When building UI, always use Outlook terminology in the interface, never Reddit terminology (unless shown in post metadata):

| Reddit concept | Outlook UI label |
|---|---|
| Subreddit | "Folder" (visually), but shown as `r/name` |
| Post feed | Message list / inbox |
| Post | Message / email |
| Comments | Replies |
| Upvote/Downvote | Shown as vote controls in reading pane toolbar |
| Hot / New / Top | Tabs in the post list header (like Focused / Other in Outlook) |
| Post score | Displayed where unread count would be |
| Saved posts | "Flagged" (conceptually) |
| r/Home feed | "Inbox" |

---

## Data Layer

The `Post` type currently has:
- `id`, `title`, `subreddit`, `author`, `time`, `score`, `comments`
- `body` (supports `**bold**` markdown)
- `imageUrl?` (optional, shown only when `mediaEnabled` is true)

The fallback sample data was completely removed. When adding real Reddit API integration, rely on the Next.js `rewrites` proxy in `next.config.ts`.

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
- Resize handles still function after the change
- The page `<title>` remains "Outlook" and the favicon remains the Outlook icon

---

## Feature Checklist

To ensure all agents are aligned on the core feature set, here is the master list of features and their current implementation status. When adding or modifying features, please update this list:

- [x] **Post Formatting**: Posts are formatted like emails. Title is subject line, body and media in the body. **Note:** Upvote counts and comment counts have been completely removed from the UI as they cannot be fetched via the unauthenticated `.rss` feed hack. Comments are fetched via RSS but displayed as a flat list. A link to the original post on Reddit is provided instead.
- [x] **Media Toggle**: Media can be turned on/off in settings. (Fully Implemented)
- [x] **Feed Sorting**: Feed should be sorted by Hot, New, and Top. Force "all time" for Top, no timeline option. No "rising" option. (Fully Implemented)
- [x] **Folder Unread Counts**: Unread counts (number of posts) beside feeds in the folder pane are explicitly NOT wanted. (Fully Implemented)
- [x] **Feed Fetching & Pagination**: Implemented fetching via Reddit's public RSS feeds to bypass `.json` API blocks. (Note: Only fetches the latest posts; deep comment trees and infinite scroll are not supported by design due to RSS limitations).
- [ ] **Subreddit List Persistence & Editing**: Subreddit list should persist via `localStorage` and be editable (new message icon to add sub, 3 dots to show delete, drag and drop). (Partially Implemented - local storage persistence exists, drag and drop / full editing UI needs work)
- [ ] **Background Fetching**: Periodically fetch new Reddit posts to keep the feed current without triggering rate limits. (Partially Implemented)
