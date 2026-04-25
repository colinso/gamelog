import { writable } from 'svelte/store';
import type { Game, Status } from './types';
import { INITIAL_GAMES } from './constants';

function loadGames(): Game[] {
  if (typeof localStorage === 'undefined') return INITIAL_GAMES;
  try {
    const s = localStorage.getItem('archive_v2');
    if (!s) return INITIAL_GAMES;
    const parsed = JSON.parse(s) as Game[];
    const seen = new Map<number, Game>();
    parsed.forEach(g => seen.set(g.id, g));
    return Array.from(seen.values());
  } catch {
    return INITIAL_GAMES;
  }
}

export type SteamGame = {
  steamAppId: number;
  title: string;
  hrsIn: number;
  coverUrl: string;
  status: Status;
};

function isSteamCover(url: string | null) {
  return url?.includes('steamstatic.com') ?? false;
}

function createGamesStore() {
  const { subscribe, set, update } = writable<Game[]>(loadGames());

  return {
    subscribe,
    add: (game: Game) => update(gs => [game, ...gs]),
    update: (game: Game) => update(gs => gs.map(g => g.id === game.id ? game : g)),
    delete: (id: number) => update(gs => gs.filter(g => g.id !== id)),
    set,
    import: (imported: Game[], merge: boolean) => update(gs => {
      if (!merge) return imported;
      const existingIds = new Set(gs.map(g => g.id));
      return [...gs, ...imported.filter(g => !existingIds.has(g.id))];
    }),
    steamSync: (steamGames: SteamGame[]) => update(gs => {
      const result = [...gs];
      for (const sg of steamGames) {
        const idx = result.findIndex(g =>
          (g.steamAppId && g.steamAppId === sg.steamAppId) ||
          g.title.toLowerCase() === sg.title.toLowerCase()
        );
        if (idx >= 0) {
          const existing = result[idx];
          result[idx] = {
            ...existing,
            steamAppId: sg.steamAppId,
            hrsIn: sg.hrsIn,
            hrsLeft: Math.max(0, (existing.ttb || 0) - sg.hrsIn),
            // Only update cover if existing one is Steam CDN or missing
            coverUrl: (!existing.coverUrl || isSteamCover(existing.coverUrl)) ? sg.coverUrl : existing.coverUrl,
            // Promote notStarted → inProgress if Steam shows playtime
            status: existing.status === 'notStarted' && sg.hrsIn > 0 ? 'inProgress' : existing.status,
          };
        } else {
          result.push({
            id: nextId(),
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
      return result;
    }),
  };
}

export const games = createGamesStore();
export { isSteamCover };

let _idCounter = 500;
export function nextId() { return ++_idCounter; }
