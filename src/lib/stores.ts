import { writable } from 'svelte/store';
import type { Game, Status } from './types';
import { isSteamCover, isGenericSteamSyncCover } from './utils';

export type SteamGame = {
  steamAppId: number;
  title: string;
  hrsIn: number;
  coverUrl: string;
  status: Status;
};

export type EpicGame = {
  epicAppName: string;
  title: string;
  hrsIn: number;
  status: Status;
};

export { isSteamCover };

function createGamesStore() {
  const { subscribe, set, update } = writable<Game[]>([]);

  return {
    subscribe,
    set,

    // Load games from API — always includes hidden so client-side filtering works
    async load(includeHidden = true) {
      const url = includeHidden ? '/api/games?includeHidden=true' : '/api/games';
      const res = await fetch(url);
      if (res.ok) {
        const games = await res.json();
        set(games);
      }
    },

    // Add a new game
    async add(game: Omit<Game, 'id'>) {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game),
      });
      if (res.ok) {
        const created = await res.json();
        update(gs => [created, ...gs]);
        return created;
      }
    },

    // Update an existing game
    async updateGame(game: Game) {
      const res = await fetch('/api/games', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game),
      });
      if (res.ok) {
        const updated = await res.json();
        update(gs => gs.map(g => g.id === updated.id ? updated : g));
      }
    },

    // Hide a game (keep in DB but exclude from view)
    async hide(id: number) {
      const res = await fetch('/api/games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        update(gs => gs.filter(g => g.id !== id));
      }
    },

    // Delete a game
    async delete(id: number) {
      const res = await fetch('/api/games', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        update(gs => gs.filter(g => g.id !== id));
      }
    },

    // Import games (merge or replace)
    async import(imported: Game[], merge: boolean) {
      if (merge) {
        // Bulk insert only games whose ID isn't already in the library
        let newGames: Game[] = [];
        update(gs => {
          const existingIds = new Set(gs.map(g => g.id));
          newGames = imported.filter(g => !existingIds.has(g.id));
          return gs;
        });

        if (newGames.length > 0) {
          await fetch('/api/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newGames),
          });
        }
      } else {
        // Clear existing library then bulk insert the imported games
        await fetch('/api/games', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true }),
        });
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imported),
        });
      }

      // Always reload from DB so IDs match what the server actually assigned
      await this.load();
    },

    // Steam sync: merge Steam games with existing library
    async steamSync(steamGames: SteamGame[]) {
      // Fetch ALL games including hidden to check if game should be skipped
      const res = await fetch('/api/games?includeHidden=true');
      if (!res.ok) {
        console.error('[steam-sync] Failed to fetch library, aborting to avoid recreating hidden games');
        return;
      }
      const allGames: Game[] = await res.json();

      const updates: Game[] = [];
      const creates: Omit<Game, 'id'>[] = [];

      for (const sg of steamGames) {
        const byAppId = allGames.find(g => g.steamAppId != null && g.steamAppId === sg.steamAppId);
        const byTitle = allGames.find(g => g.title.toLowerCase() === sg.title.toLowerCase());
        const existing = byAppId ?? byTitle;

        if (existing?.hidden) {
          continue;
        }

        if (existing) {
          // Update existing game — never overwrite user-set status
          const updated: Game = {
            ...existing,
            steamAppId: sg.steamAppId,
            hrsIn: Math.max(sg.hrsIn, existing.hrsIn ?? 0),
            hrsLeft: Math.max(0, (existing.ttb || 0) - Math.max(sg.hrsIn, existing.hrsIn ?? 0)),
            coverUrl: (!existing.coverUrl || isGenericSteamSyncCover(existing.coverUrl)) ? sg.coverUrl : existing.coverUrl,
          };
          updates.push(updated);
        } else {
          creates.push({
            title: sg.title,
            platform: 'PC',
            status: sg.status,
            hrsIn: sg.hrsIn,
            ttb: 0,
            hrsLeft: 0,
            rating: null,
            coop: false,
            coverUrl: sg.coverUrl,
            steamAppId: sg.steamAppId,
          });
        }
      }

      // Batch update existing games
      for (const game of updates) {
        await fetch('/api/games', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(game),
        });
      }

      // Bulk create new games
      if (creates.length > 0) {
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creates),
        });
      }

      // Reload from server
      await this.load();
    },

    // Epic sync: merge Epic games with existing library
    async epicSync(epicGames: EpicGame[]) {
      const res = await fetch('/api/games?includeHidden=true');
      if (!res.ok) {
        console.error('[epic-sync] Failed to fetch library, aborting');
        return;
      }
      const allGames: Game[] = await res.json();

      const updates: Game[] = [];
      const creates: Omit<Game, 'id'>[] = [];

      for (const eg of epicGames) {
        const byAppName = allGames.find(g => g.epicAppName === eg.epicAppName);
        const byTitle = allGames.find(g => g.title.toLowerCase() === eg.title.toLowerCase());
        const existing = byAppName ?? byTitle;

        if (existing?.hidden) continue;

        if (existing) {
          const hrsIn = Math.max(eg.hrsIn, existing.hrsIn ?? 0);
          updates.push({
            ...existing,
            title: eg.title,
            epicAppName: eg.epicAppName,
            hrsIn,
            hrsLeft: Math.max(0, (existing.ttb || 0) - hrsIn),
          });
        } else {
          creates.push({
            title: eg.title,
            platform: 'PC',
            status: eg.status,
            hrsIn: eg.hrsIn,
            ttb: 0,
            hrsLeft: 0,
            rating: null,
            coop: false,
            coverUrl: null,
            epicAppName: eg.epicAppName,
          });
        }
      }

      for (const game of updates) {
        await fetch('/api/games', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(game),
        });
      }

      if (creates.length > 0) {
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creates),
        });
      }

      await this.load();
    },
  };
}

export const games = createGamesStore();
