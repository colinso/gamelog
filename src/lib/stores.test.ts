import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Game } from './types';
import type { SteamGame } from './stores';

// Mock fetch globally
global.fetch = vi.fn();

function mockFetch(url: string, options?: RequestInit) {
  return Promise.resolve({
    ok: true,
    json: async () => {
      if (url.includes('/api/games') && !options?.method) {
        // GET request
        return mockGames;
      }
      if (url.includes('/api/games') && options?.method === 'PATCH') {
        // PATCH request - return the updated game
        const body = JSON.parse(options.body as string);
        return body;
      }
      if (url.includes('/api/games') && options?.method === 'POST') {
        // POST request - return created games with IDs
        const body = JSON.parse(options.body as string);
        if (Array.isArray(body)) {
          return body.map((g, i) => ({ ...g, id: mockGames.length + i + 1 }));
        }
        return { ...body, id: mockGames.length + 1 };
      }
      return [];
    },
  } as Response);
}

let mockGames: Game[] = [];

describe('Steam Sync', () => {
  beforeEach(() => {
    mockGames = [];
    vi.clearAllMocks();
    (global.fetch as any).mockImplementation(mockFetch);
  });

  it('should create new games from Steam library', async () => {
    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 123456,
        title: 'New Steam Game',
        hrsIn: 5,
        coverUrl: 'https://steamstatic.com/cover.jpg',
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    // Verify POST was called to create new game
    expect(fetch).toHaveBeenCalledWith(
      '/api/games',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New Steam Game'),
      })
    );
  });

  it('should update existing game matched by steamAppId', async () => {
    mockGames = [
      {
        id: 1,
        title: 'Existing Game',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 10,
        hrsLeft: 10,
        rating: null,
        coop: false,
        coverUrl: null,
        steamAppId: 123456,
      },
    ];

    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 123456,
        title: 'Existing Game',
        hrsIn: 5,
        coverUrl: 'https://steamstatic.com/new-cover.jpg',
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    // Verify PATCH was called to update existing game
    expect(fetch).toHaveBeenCalledWith(
      '/api/games',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"hrsIn":5'),
      })
    );
  });

  it('should update existing game matched by title (case-insensitive)', async () => {
    mockGames = [
      {
        id: 1,
        title: 'Portal 2',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 8,
        hrsLeft: 8,
        rating: null,
        coop: false,
        coverUrl: null,
        steamAppId: undefined,
      },
    ];

    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 620,
        title: 'PORTAL 2', // Different case
        hrsIn: 3,
        coverUrl: 'https://steamstatic.com/portal2.jpg',
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    // Verify PATCH was called with steamAppId added
    expect(fetch).toHaveBeenCalledWith(
      '/api/games',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"steamAppId":620'),
      })
    );
  });

  it('should skip hidden games during sync', async () => {
    mockGames = [
      {
        id: 1,
        title: 'Hidden Game',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 10,
        hrsLeft: 10,
        rating: null,
        coop: false,
        coverUrl: null,
        steamAppId: 999999,
        hidden: true, // This game is hidden
      } as any,
    ];

    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 999999,
        title: 'Hidden Game',
        hrsIn: 10,
        coverUrl: 'https://steamstatic.com/cover.jpg',
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    // Verify PATCH was NOT called for hidden game
    const patchCalls = (fetch as any).mock.calls.filter(
      (call: any[]) => call[1]?.method === 'PATCH'
    );
    expect(patchCalls).toHaveLength(0);
  });

  it('should prefer steamAppId match over title match', async () => {
    mockGames = [
      {
        id: 1,
        title: 'Game A',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 10,
        hrsLeft: 10,
        rating: null,
        coop: false,
        coverUrl: null,
        steamAppId: 111,
      },
      {
        id: 2,
        title: 'Game B',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 10,
        hrsLeft: 10,
        rating: null,
        coop: false,
        coverUrl: null,
        steamAppId: undefined,
      },
    ];

    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 111,
        title: 'Game B', // Title matches second game, but steamAppId matches first
        hrsIn: 5,
        coverUrl: 'https://steamstatic.com/cover.jpg',
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    // Should update game with id=1 (steamAppId match), not id=2 (title match)
    const patchCalls = (fetch as any).mock.calls.filter(
      (call: any[]) => call[1]?.method === 'PATCH'
    );
    expect(patchCalls).toHaveLength(1);
    const updateBody = JSON.parse(patchCalls[0][1].body);
    expect(updateBody.id).toBe(1);
  });

  it('should preserve RAWG cover over Steam cover', async () => {
    mockGames = [
      {
        id: 1,
        title: 'Game with RAWG Cover',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 10,
        hrsLeft: 10,
        rating: null,
        coop: false,
        coverUrl: 'https://media.rawg.io/cover.jpg', // RAWG cover
        steamAppId: 123,
      },
    ];

    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 123,
        title: 'Game with RAWG Cover',
        hrsIn: 5,
        coverUrl: 'https://steamstatic.com/new-cover.jpg', // Steam cover
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    const patchCalls = (fetch as any).mock.calls.filter(
      (call: any[]) => call[1]?.method === 'PATCH'
    );
    const updateBody = JSON.parse(patchCalls[0][1].body);
    // Should keep RAWG cover
    expect(updateBody.coverUrl).toBe('https://media.rawg.io/cover.jpg');
  });

  it('should replace Steam cover with new Steam cover', async () => {
    mockGames = [
      {
        id: 1,
        title: 'Game with old Steam cover',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 10,
        hrsLeft: 10,
        rating: null,
        coop: false,
        coverUrl: 'https://steamstatic.com/old-cover.jpg', // Old Steam cover
        steamAppId: 123,
      },
    ];

    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 123,
        title: 'Game with old Steam cover',
        hrsIn: 5,
        coverUrl: 'https://steamstatic.com/new-cover.jpg', // New Steam cover
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    const patchCalls = (fetch as any).mock.calls.filter(
      (call: any[]) => call[1]?.method === 'PATCH'
    );
    const updateBody = JSON.parse(patchCalls[0][1].body);
    // Should update to new Steam cover
    expect(updateBody.coverUrl).toBe('https://steamstatic.com/new-cover.jpg');
  });

  it('should NOT change status of existing games during sync (user-set status is preserved)', async () => {
    mockGames = [
      {
        id: 1,
        title: 'Not Started Game',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 10,
        hrsLeft: 10,
        rating: null,
        coop: false,
        coverUrl: null,
        steamAppId: 123,
      },
    ];

    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 123,
        title: 'Not Started Game',
        hrsIn: 2, // Steam thinks it's been played
        coverUrl: 'https://steamstatic.com/cover.jpg',
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    const patchCalls = (fetch as any).mock.calls.filter(
      (call: any[]) => call[1]?.method === 'PATCH'
    );
    const updateBody = JSON.parse(patchCalls[0][1].body);
    // Status must NOT be overwritten by Steam sync
    expect(updateBody.status).toBe('notStarted');
  });

  it('should preserve all user-set statuses (beat, abandoned, etc.) during sync', async () => {
    mockGames = [
      {
        id: 1,
        title: 'Beat Game',
        platform: 'PC',
        status: 'beat',
        hrsIn: 20,
        ttb: 20,
        hrsLeft: 0,
        rating: 9,
        coop: false,
        coverUrl: null,
        steamAppId: 123,
      },
    ];

    const { games } = await import('./stores');

    const steamGames: SteamGame[] = [
      {
        steamAppId: 123,
        title: 'Beat Game',
        hrsIn: 25, // Played more hours
        coverUrl: 'https://steamstatic.com/cover.jpg',
        status: 'inProgress',
      },
    ];

    await games.steamSync(steamGames);

    const patchCalls = (fetch as any).mock.calls.filter(
      (call: any[]) => call[1]?.method === 'PATCH'
    );
    const updateBody = JSON.parse(patchCalls[0][1].body);
    // Should keep 'beat' status, not change to inProgress
    expect(updateBody.status).toBe('beat');
  });
});
