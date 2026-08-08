# Reddit365

A UI clone of Microsoft New Outlook that displays Reddit content in place of emails. The tab title reads "Outlook" and uses the real Outlook favicon, so it blends into a browser tab bar like any other work app.

![Reddit365 Image Loading Example](./public/images/screenshot-1.png)
![Reddit365 Text Post Example](./public/images/screenshot-2.png)

## Features

- **Subreddits as folders** — your subscribed subreddits appear as email folders in the left sidebar. Add, remove, and drag to reorder them.
- **Post feed** — posts are listed as emails in the middle column. Sort by Hot, New, or Top.
- **Reading pane** — selecting a post opens its content and comments on the right, formatted as an email thread. External image links (like `i.redd.it`) are automatically expanded into inline images.
- **Help & Settings** — an accessible modal provides usage details, technical performance notes, and media embedding toggles.
- **Disguise details** — tab title, favicon, and overall Fluent Design aesthetic match New Outlook closely enough to pass a casual glance.

## Limitations

Reddit heavily restricts unauthenticated API access, so Reddit365 uses public RSS feeds rather than Reddit's JSON API. A few things aren't possible as a result:

- **Read-only** — no login, voting, or replying.
- **Flat comments** — the RSS feed doesn't include threading, so replies to comments look identical to top-level comments. The feed is also capped at 50 comments, sorted by Best only.
- **Rate limiting & Caching** — Reddit throttles RSS requests. The app handles this with exponential backoff, but switching subreddits quickly may cause a delay. To ensure stability, the backend is hardened with IP-based rate limiting, a 30-second upstream fetch timeout, and caches every response indefinitely (FIFO eviction). The refresh button busts the cache and fetches live content from Reddit.

## License

This project is licensed under the [GPL-3.0](LICENSE.md)
GNU General Public License — see the [LICENSE.md](LICENSE.md) file for details.
