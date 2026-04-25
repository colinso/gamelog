import { writable } from 'svelte/store';
import type { Game, Status } from './types';

export type SteamGame = {
  steamAppId: number;
  title: string;
  hrsIn: number;
  coverUrl: string;
  status: Status;
};

export function isSteamCover(url: string | null) {
  return url?.includes('steamstatic.com') ?? false;
}

function createGamesStore() {
  const { subscribe, set, update } = writable<Game[]>([]);

  return {
    subscribe,
    set,

    // Load games from API
    async load() {
      const res = await fetch('/api/games');
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
        // Bulk insert only new games
        update(gs => {
          const existingIds = new Set(gs.map(g => g.id));
          const newGames = imported.filter(g => !existingIds.has(g.id));

          // Send to server
          if (newGames.length > 0) {
            fetch('/api/games', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newGames),
            });
          }

          return [...gs, ...newGames];
        });
      } else {
        // Replace all (this would need a "delete all" endpoint, or just bulk insert and reload)
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imported),
        });
        set(imported);
      }
    },

    // Steam sync: merge Steam games with existing library
    async steamSync(steamGames: SteamGame[]) {
      let currentGames: Game[] = [];
      update(gs => {
        currentGames = gs;
        return gs;
      });

      const updates: Game[] = [];
      const creates: Omit<Game, 'id'>[] = [];

      for (const sg of steamGames) {
        const existing = currentGames.find(g =>
          (g.steamAppId && g.steamAppId === sg.steamAppId) ||
          g.title.toLowerCase() === sg.title.toLowerCase()
        );

        if (existing) {
          // Update existing game
          const updated: Game = {
            ...existing,
            steamAppId: sg.steamAppId,
            hrsIn: sg.hrsIn,
            hrsLeft: Math.max(0, (existing.ttb || 0) - sg.hrsIn),
            coverUrl: (!existing.coverUrl || isSteamCover(existing.coverUrl)) ? sg.coverUrl : existing.coverUrl,
            status: existing.status === 'notStarted' && sg.hrsIn > 0 ? 'inProgress' : existing.status,
          };
          updates.push(updated);
        } else {
          // Create new game
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
  };
}

export const games = createGamesStore();
