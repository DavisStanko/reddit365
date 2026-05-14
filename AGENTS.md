<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Reddit365 — Agent Context

## What This Project Is

**Reddit365 is a pixel-faithful UI clone of Microsoft Outlook (New Outlook / Monarch) that displays Reddit content instead of emails.**

The UI must be indistinguishable from real Outlook at a glance. Every layout decision, color, spacing, font, interaction, and animation should ask: *"Does this look exactly like New Outlook?"* If yes, ship it. If not, fix it.

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
│ Icon │  Folder Pane │  Post List   │  Reading Pane  │
│ Rail │  (resizable) │  (resizable) │  (flex: 1)     │
│ 48px │  default:220 │  default:340 │                │
│      │  min:160     │  min:200     │                │
│      │  max:400     │  max:600     │                │
└──────┴──────────────┴──────────────┴────────────────┘
```

- **`.outlook-shell`** — `display: flex; flex-direction: column; height: 100vh; overflow: hidden`
- **`.outlook-shell__body`** — `display: flex; flex: 1; overflow: hidden`
- **`.outlook-shell__folder`** — fixed width, `border-right`
- **`.outlook-shell__list`** — fixed width, `border-right`
- **`.outlook-shell__content`** — `flex: 1; min-width: 0`
- Between each resizable pane: a `<ResizeHandle>` component

### Resize Handles
`components/layout/resize-handle.tsx` — 4px wide, transparent by default, turns `--outlook-blue` on hover/drag.

---

## Component Map

| File | Outlook Equivalent | Notes |
|---|---|---|
| `components/layout/top-bar.tsx` | Top ribbon/nav bar | Blue bg, "Reddit365" wordmark, search, avatar |
| `components/layout/icon-rail.tsx` | Left nav icon strip | Dark bg, 48px wide, Fluent active indicator |
| `components/layout/folder-pane.tsx` | Folder list sidebar | Shows subreddits as "folders", expandable groups |
| `components/layout/content-pane.tsx` | Reading/message pane | Post detail view with vote bar, body, toolbar |
| `components/layout/resize-handle.tsx` | Pane resize splitter | Draggable col-resize handle |
| `components/settings-context.tsx` | Settings state | `mediaEnabled` toggle (show/hide images in reading pane) |
| `app/page.tsx` | Main shell | Composes all panels, manages resize state |

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

Sample posts live in `lib/sample-posts.ts`. The `Post` type currently has:
- `id`, `title`, `subreddit`, `author`, `time`, `score`, `comments`
- `body` (supports `**bold**` markdown)
- `imageUrl?` (optional, shown only when `mediaEnabled` is true)

When adding real Reddit API integration, keep this shape — just replace the sample data source.

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

- [x] **Post Formatting**: Posts are formatted like emails. Title is subject line, body and media in the body, comments as replies. (Fully Implemented)
- [x] **Media Toggle**: Media can be turned on/off in settings. (Fully Implemented)
- [x] **Feed Sorting**: Feed should be sorted by Hot, New, and Top. Force "all time" for Top, no timeline option. No "rising" option. (Fully Implemented)
- [ ] **Feed Fetching & Infinite Scroll**: Feed should fetch when selected, not a mass fetch on page load (e.g., when selecting a subreddit, load one page of posts). Respect the selected sorting option. Implement infinite scroll. (Partially Implemented - fetching works, infinite scroll/exact behavior needs verification)
- [ ] **Subreddit List Persistence & Editing**: Subreddit list should persist via `localStorage` and be editable (new message icon to add sub, 3 dots to show delete, drag and drop). (Partially Implemented - local storage persistence exists, drag and drop / full editing UI needs work)
- [ ] **Background Fetching**: Periodically fetch new Reddit posts to keep the feed current without triggering rate limits. (Partially Implemented)
- [ ] **OAuth Integration**: User can provide OAuth to get their own personalized frontpage shown. (Not Implemented)
