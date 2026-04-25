# GameLog Todo & Roadmap

## 🔴 Critical (Blocks MVP)

- [ ] **Persistent Storage (SQLite or alternative)**
  - Currently: browser localStorage only (limited to ~5MB, single device)
  - Need: Server-side DB, sync to client on load
  - Impact: Games lost if cache cleared; no multi-device sync
  - Options: SQLite (simple, self-hosted), PostgreSQL, Firebase, Supabase
  - Scope: Schema design, API endpoints for CRUD, migration from localStorage

- [ ] **Hide/Skip Flag for Games**
  - Problem: When Steam sync runs, re-imported games can pollute the library
  - Solution: Add `hidden` boolean flag to Game type; hide from UI but keep in DB
  - Also: "Mark as hiding from future syncs" toggle in game details
  - Scope: Type update, UI checkbox, filter logic

## 🟡 High Priority (v0.2)

- [ ] **Quick Status Change (Long-press/Context Menu)**
  - Currently: Must open DetailModal → edit → save
  - Desired: Long-press game card → show status options → instant update
  - Or: Right-click context menu with status shortcuts
  - Scope: Card component event handling, modal or menu component

- [ ] **Steam Family Sharing & Recently Played**
  - Problem: Only imports owned games, misses shared/free2play titles
  - Solution 1: `GetRecentlyPlayed` endpoint (games played in last 24h, even borrowed)
  - Solution 2: Scrape community page (https://steamcommunity.com/id/coolbean009/games/) for full library
  - Scope: New `/api/steam/shared` or `/api/steam/recent` endpoint, dedup logic
  - Note: May need IP-based rate limiting for scraping approach

- [ ] **Nintendo Switch Recently Played (nxapi)**
  - Library: https://github.com/samuelthomas2774/nxapi
  - Requires: NSO (Nintendo Switch Online) account auth
  - New endpoint: `/api/switch/recent` → fetch recent plays, merge like Steam
  - Scope: Integrate nxapi, auth flow, merge logic

- [ ] **Steam Wishlist Import**
  - Endpoint: `GetUserStats` → wishlist or scrape wishlist page
  - Or: Parse https://steamcommunity.com/id/coolbean009/wishlist
  - Add wishlist items as `wishlist` status games
  - Scope: New `/api/steam/wishlist` endpoint, UI for wishlist section

## 🟢 Medium Priority (v0.3)

- [ ] **Long-term Multiplayer Section**
  - New status: `Multiplayer` or `Active` (for ongoing games not really "beatable")
  - Examples: Baldur's Gate 3 co-op runs, Elden Ring invasions, roguelikes
  - Scope: Add status group, update status display logic

- [ ] **Price Field for Wishlist Items**
  - Track current price, historical low, sale alerts
  - Could pull from Steam API or scrape pricing services
  - Scope: Game type field, Settings modal option to enable/show pricing

- [ ] **Docker Compose Setup**
  - Self-hosted deployment on home server
  - Services: Node.js app, SQLite (or Postgres), optional Redis for caching
  - Scope: Dockerfile, docker-compose.yml, README deployment section

- [ ] **Advanced Filtering**
  - Filter by TTB range, playtime range, co-op, rating
  - Saved filters (if persistent storage ready)
  - Scope: Filter UI, store filters in DB

- [ ] **Sort by TTB or Hours Left**
  - Currently: Sort by status/platform/title only
  - Add: Sort by TTB ascending/descending, hours left
  - Scope: Sort options in header, UI toggle

## 🔵 Nice to Have (v0.4+)

- [ ] **Achievements/Badges**
  - "Completed this month", "100% completion", "Co-op champion"
  - Scope: Visual badges, stats dashboard

- [ ] **Game Notes/Reviews**
  - Already have notes field; could add markdown support, star rating per session
  - Scope: Markdown parser, richer detail view

- [ ] **API Key Management UI**
  - Currently: `.env` file only
  - Add: Settings page to paste/rotate API keys (stored server-side)
  - Scope: Secure form, encryption at rest

- [ ] **Mobile App / PWA Offline Mode**
  - Already PWA; enhance with offline caching and sync queue
  - Scope: Service worker improvements, sync logic

- [ ] **Share Library / Leaderboards**
  - Export shareable link to view friends' backlogs
  - Scope: Auth system, public profiles, sharing tokens

---

## Notes

**Persistence:** Once SQLite is in, `hide` flag becomes much easier because we can query `WHERE hidden = false` server-side.

**Sync Order:** Steam → Family Sharing → Wishlist → Switch → (future: Epic, GOG, etc.)

**Rate Limiting:** If scraping Steam community page, use exponential backoff and respect robots.txt.

**Auth:** Steam family sharing may need user confirmation (different account). Consider OAuth or session key approach.

**Test Priority:** Once persistence + hide flag are done, test Steam + wishlist + Switch imports in tandem to ensure no dupes.
