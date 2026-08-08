# Reddit365

A UI clone of Microsoft New Outlook that displays Reddit content in place of emails. This works despite Reddit's ban on third-party clients by proxying all calls to Reddit's RSS feeds through the server and aggressively caching them.

## How to use

Manage your subreddit list from the sidebar. Sort the post feed by Hot, New, or Top. Select a post to read it and its comments in the reading pane. Open Help & Settings for usage details, technical performance notes, and media embedding toggles. Use the refresh button to bust the cache and fetch live content from Reddit.

## How it works

Reddit heavily restricts unauthenticated API access. Reddit365 uses public RSS feeds instead of Reddit's JSON API. This has a few effects:

- **Read-only** — no login, voting, or replying.
- **Flat comments** — the RSS feed does not include threading, so replies to comments look identical to top-level comments. The feed also caps at 50 comments, sorted by Best only.
- **Rate limiting and caching** — Reddit throttles RSS requests. The app handles this with exponential backoff, but switching subreddits quickly may cause a delay. The backend uses IP-based rate limiting, a 30-second upstream fetch timeout, and caches every response indefinitely (FIFO eviction). The refresh button busts the cache.

## License

This project uses the GPL-3.0 license. See the [LICENSE.md](LICENSE.md) file for details.