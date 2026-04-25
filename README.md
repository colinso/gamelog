# GameLog – Gaming Backlog Manager

A SvelteKit PWA for tracking your game library, playtime, and progress across platforms.

## Features

**Core**
- ✅ Add/edit/delete games with title, platform, playtime, TTB (Time to Beat), rating, co-op flag, notes
- ✅ Status groups: Not Started, In Progress, Completed, On Shelf, Wishlist
- ✅ Search, sort (by status, platform, TTB), filter
- ✅ Persistent JSON export/import for backup and sharing

**Cover Art**
- ✅ RAWG integration for cover searches
- ✅ Manual image upload (canvas-resized to 640x360 JPEG)
- ✅ Steam CDN fallback for owned games

**Game Data**
- ✅ Steam library import (owned games)
- ✅ IGDB TTB lookup via `game_time_to_beats` endpoint
- ✅ Merge logic: deduplication by `steamAppId`, then title
- ✅ Hours played from Steam playtime data

**Import/Sync**
- ✅ One-click Steam sync button with last-synced timestamp
- ✅ Automatic background TTB fetch for games without data
- ✅ Auto-sync on app load (if >1 hour stale)

**Settings**
- ✅ Theme picker (light/dark/auto)
- ✅ Import/export library as JSON

## Tech Stack

- **Frontend**: SvelteKit, TypeScript, CSS (no frameworks)
- **Server**: SvelteKit adapter-node (needed for API routes)
- **APIs**: 
  - [IGDB](https://api-docs.igdb.com/) – game metadata & TTB
  - [RAWG](https://rawg.io/) – cover art search
  - [Steam](https://partner.steamgames.com/doc/webapi) – owned games & playtime
- **Storage**: Browser localStorage (JSON)
- **Deployment**: Node.js (self-hosted on home server)

## Getting Started

### Prerequisites
```bash
Node.js 18+
npm
```

### Environment Variables
Create a `.env` file at the project root:
```
IGDB_CLIENT_ID=<your_twitch_oauth_client_id>
IGDB_CLIENT_SECRET=<your_twitch_oauth_client_secret>
STEAM_API_KEY=<your_steam_api_key>
STEAM_ACCOUNT_ID=<your_steam_account_id>
RAWG_API_KEY=<your_rawg_api_key>
```

**Getting credentials:**
- **IGDB**: Register Twitch OAuth app at https://dev.twitch.tv/console/apps
- **Steam**: Get API key from https://steamcommunity.com/dev/apikey, account ID from https://steamidfinder.com/
- **RAWG**: Sign up at https://rawg.io/api (free tier)

### Install & Run
```bash
npm install
npm run dev
# Opens http://localhost:5173
```

### Build & Deploy
```bash
npm run build
# Outputs to build/ directory
node build/index.js  # Start on port 3000 (configurable via PORT env var)
```

## Project Structure
```
src/
├── lib/
│   ├── components/        # Modals, search components
│   ├── types.ts           # Game interface
│   ├── stores.ts          # Game store with CRUD + Steam sync
│   ├── theme.ts           # Theme logic
│   ├── constants.ts       # Status groups, platforms
│   └── utils.ts           # Helpers (fmt, pct)
├── routes/
│   ├── +page.svelte       # Main UI
│   └── api/
│       ├── steam/         # GET /api/steam – fetch owned games
│       ├── hltb/          # GET /api/hltb?q=... – search TTB via IGDB
│       └── rawg/          # (future) cover art search
└── app.html

static/              # Icon, manifest, service worker
.env                 # Env vars (not committed)
```

## Key Concepts

**Steam Merge Strategy**
- Exact match by `steamAppId` (if game already has one)
- Fallback to case-insensitive title match
- Preserves existing data: cover art only updates if missing or Steam CDN, rating/notes/status unchanged unless steam sync provided a value

**TTB Hierarchy**
1. Try IGDB `game_time_to_beats` (can be 0 if no data)
2. Accept user-entered TTB in AddModal/DetailModal
3. Pull from RAWG search results if available

**Cover Art Hierarchy**
1. User-uploaded custom image
2. RAWG search result (preferred)
3. Steam CDN (fallback for owned games)
4. None (graceful fallback)

**Status Logic**
- Steam import: 0 min playtime → `notStarted`, >0 → `inProgress`
- User can override at any time
- `hrsLeft = max(0, ttb - hrsIn)` computed automatically

## See Also
- [TODO.md](TODO.md) – Roadmap and in-progress features
- Full transcript: `.claude/projects/...` (session history)
