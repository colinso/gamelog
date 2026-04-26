# GameLog TODO

## Completed ✅
- [x] SQLite database with server-side persistence
- [x] SvelteKit adapter-node + API routes
- [x] Docker multi-stage build + docker-compose for self-hosting
- [x] Drag-and-drop status changes (desktop) — drag card to any section header
- [x] Long press (mobile, 500ms + haptic) & right-click (desktop) status picker modal
- [x] Row-based pagination — 2 full rows shown, "show more" adds 2 rows; uses ResizeObserver to match actual column count (always 4 or 2 columns, never 3)
- [x] Streamline AddModal — RAWG search populates title/cover/TTB; title field hidden unless overriding
- [x] Fix RAWGSearch form submission bug — TTB chip buttons were missing type="button"
- [x] Fix persistence — await all async store operations (add, import, steamSync)
- [x] Fix Steam sync overwriting user-set statuses — sync now only writes status for new games
- [x] Add "In Rotation" status for multiplayer/ongoing live-service games
- [x] Logo click returns home (clears filter + search)
- [x] Search clear button (×)
- [x] Alphabetize games within each section
- [x] Drag into and out of the Playing section
- [x] Simplify header: "X games", larger + higher contrast; "add game" button copy

## In Progress 🔄

### Steam Family Sharing & Recently Played
Track your own playtime on family-shared games (not owned by you, so they
don't appear in GetOwnedGames). Also keep hrsIn up to date from Steam
without a full manual sync.

**Plan:**
- Use `IPlayerService/GetRecentlyPlayedGames` (returns up to 10 games
  played in the last 2 weeks, includes family-shared titles)
- On each app load (or manual trigger), diff `playtime_forever` against
  stored `hrsIn` — update the record if Steam shows more hours
- If a game appears in recently-played but isn't in our DB yet, import it
  (same flow as the owned-games sync, status derived from playtime)
- Once a game is stored we keep it regardless of the 2-week window
- No scraping needed; no friend data involved — your own Steam ID only

**New work:**
1. `/api/steam/recent` server route — calls GetRecentlyPlayedGames, returns
   normalized list (same shape as /api/steam owned-games response)
2. Extend `steamSync()` in stores.ts to accept and merge recently-played
   data alongside owned games, deduplicating by steamAppId
3. Auto-run recently-played sync on every app load (lightweight, ~1 API call)
4. Manual "Sync recently played" button in Settings (or fold into existing
   Steam sync button)

## Pending ⏳
- [ ] Make status field more prominent in AddModal — user often forgets to
      set it before submitting; ideas: larger pill buttons instead of select,
      or move status to the top of the form
- [ ] Manual drag-to-reorder games within a section — currently alphabetized;
      will need a `sort_order` column in the DB and drag-handle UX

## Future Ideas 💡
- Keyboard shortcuts for status changes (e.g. 1-7 when a card is focused)
- Bulk operations — select multiple games, change status or delete in bulk
- Stats / analytics page — hours by platform, completion rate, backlog growth over time
- Export to CSV / JSON
- Custom themes / accent color picker
