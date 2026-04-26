import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Game } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create in-memory test database
let testDb: Database.Database;

// Helper functions that mirror db.ts but use testDb
function initTestDb() {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  testDb.exec(schema);
}

type DbGame = {
  id: number;
  title: string;
  platform: string;
  status: string;
  hrs_in: number;
  ttb: number;
  hrs_left: number;
  rating: number | null;
  coop: number;
  notes: string | null;
  cover_url: string | null;
  steam_app_id: number | null;
  hidden: number;
};

function dbToGame(row: DbGame): Game {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    status: row.status as Game['status'],
    hrsIn: row.hrs_in,
    ttb: row.ttb,
    hrsLeft: row.hrs_left,
    rating: row.rating,
    coop: Boolean(row.coop),
    notes: row.notes || undefined,
    coverUrl: row.cover_url,
    steamAppId: row.steam_app_id || undefined,
  };
}

function gameToDb(game: Partial<Game>) {
  return {
    title: game.title,
    platform: game.platform,
    status: game.status,
    hrs_in: game.hrsIn,
    ttb: game.ttb,
    hrs_left: game.hrsLeft,
    rating: game.rating ?? null,
    coop: game.coop ? 1 : 0,
    notes: game.notes || null,
    cover_url: game.coverUrl || null,
    steam_app_id: game.steamAppId || null,
  };
}

// Test-specific CRUD operations
function testGetAllGames(includeHidden = false): Game[] {
  const query = includeHidden
    ? 'SELECT * FROM games ORDER BY updated_at DESC'
    : 'SELECT * FROM games WHERE hidden = 0 ORDER BY updated_at DESC';
  const rows = testDb.prepare(query).all() as DbGame[];
  return rows.map(dbToGame);
}

function testCreateGame(game: Omit<Game, 'id'>): Game {
  const dbGame = gameToDb(game);
  const stmt = testDb.prepare(`
    INSERT INTO games (title, platform, status, hrs_in, ttb, hrs_left, rating, coop, notes, cover_url, steam_app_id)
    VALUES (@title, @platform, @status, @hrs_in, @ttb, @hrs_left, @rating, @coop, @notes, @cover_url, @steam_app_id)
  `);
  const info = stmt.run(dbGame);
  return { ...game, id: Number(info.lastInsertRowid) };
}

function testUpdateGame(id: number, updates: Partial<Game>): Game | null {
  const existing = testDb.prepare('SELECT * FROM games WHERE id = ?').get(id) as DbGame | undefined;
  if (!existing) return null;

  const merged = { ...dbToGame(existing), ...updates };
  const dbGame = gameToDb(merged);

  testDb.prepare(`
    UPDATE games SET
      title = @title, platform = @platform, status = @status,
      hrs_in = @hrs_in, ttb = @ttb, hrs_left = @hrs_left,
      rating = @rating, coop = @coop, notes = @notes,
      cover_url = @cover_url, steam_app_id = @steam_app_id
    WHERE id = @id
  `).run({ ...dbGame, id });

  return merged;
}

function testDeleteGame(id: number): boolean {
  const info = testDb.prepare('DELETE FROM games WHERE id = ?').run(id);
  return info.changes > 0;
}

function testHideGame(id: number): boolean {
  const info = testDb.prepare('UPDATE games SET hidden = 1 WHERE id = ?').run(id);
  return info.changes > 0;
}

function testBulkInsertGames(games: Omit<Game, 'id'>[]): number {
  const stmt = testDb.prepare(`
    INSERT INTO games (title, platform, status, hrs_in, ttb, hrs_left, rating, coop, notes, cover_url, steam_app_id)
    VALUES (@title, @platform, @status, @hrs_in, @ttb, @hrs_left, @rating, @coop, @notes, @cover_url, @steam_app_id)
  `);

  const insertMany = testDb.transaction((games: Omit<Game, 'id'>[]) => {
    for (const game of games) {
      stmt.run(gameToDb(game));
    }
  });

  insertMany(games);
  return games.length;
}

describe('Database Operations', () => {
  beforeEach(() => {
    initTestDb();
  });

  afterAll(() => {
    if (testDb) testDb.close();
  });

  describe('createGame', () => {
    it('should create a new game', () => {
      const newGame: Omit<Game, 'id'> = {
        title: 'Test Game',
        platform: 'PC',
        status: 'notStarted',
        hrsIn: 0,
        ttb: 10,
        hrsLeft: 10,
        rating: null,
        coop: false,
        coverUrl: null
      };

      const created = testCreateGame(newGame);

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Test Game');
      expect(created.platform).toBe('PC');
    });

    it('should auto-increment IDs', () => {
      const game1 = testCreateGame({ title: 'Game 1', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 0, hrsLeft: 0, rating: null, coop: false, coverUrl: null });
      const game2 = testCreateGame({ title: 'Game 2', platform: 'PS5', status: 'inProgress', hrsIn: 5, ttb: 10, hrsLeft: 5, rating: null, coop: false, coverUrl: null });

      expect(game2.id).toBeGreaterThan(game1.id);
    });
  });

  describe('getAllGames', () => {
    it('should return empty array when no games exist', () => {
      const games = testGetAllGames();
      expect(games).toEqual([]);
    });

    it('should return all non-hidden games by default', () => {
      testCreateGame({ title: 'Visible Game', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 0, hrsLeft: 0, rating: null, coop: false, coverUrl: null });
      const game2 = testCreateGame({ title: 'Hidden Game', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 0, hrsLeft: 0, rating: null, coop: false, coverUrl: null });
      testHideGame(game2.id);

      const games = testGetAllGames(false);
      expect(games).toHaveLength(1);
      expect(games[0].title).toBe('Visible Game');
    });

    it('should return all games including hidden when includeHidden is true', () => {
      testCreateGame({ title: 'Game 1', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 0, hrsLeft: 0, rating: null, coop: false, coverUrl: null });
      const game2 = testCreateGame({ title: 'Game 2', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 0, hrsLeft: 0, rating: null, coop: false, coverUrl: null });
      testHideGame(game2.id);

      const games = testGetAllGames(true);
      expect(games).toHaveLength(2);
    });
  });

  describe('updateGame', () => {
    it('should update game fields', () => {
      const created = testCreateGame({ title: 'Old Title', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 10, hrsLeft: 10, rating: null, coop: false, coverUrl: null });

      const updated = testUpdateGame(created.id, { title: 'New Title', hrsIn: 5, hrsLeft: 5 });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('New Title');
      expect(updated?.hrsIn).toBe(5);
      expect(updated?.platform).toBe('PC');
    });

    it('should return null for non-existent game', () => {
      const updated = testUpdateGame(999, { title: 'Test' });
      expect(updated).toBeNull();
    });
  });

  describe('deleteGame', () => {
    it('should delete a game', () => {
      const created = testCreateGame({ title: 'To Delete', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 0, hrsLeft: 0, rating: null, coop: false, coverUrl: null });

      const deleted = testDeleteGame(created.id);
      expect(deleted).toBe(true);

      const games = testGetAllGames();
      expect(games).toHaveLength(0);
    });

    it('should return false for non-existent game', () => {
      const deleted = testDeleteGame(999);
      expect(deleted).toBe(false);
    });
  });

  describe('hideGame', () => {
    it('should hide a game from default view', () => {
      const created = testCreateGame({ title: 'To Hide', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 0, hrsLeft: 0, rating: null, coop: false, coverUrl: null });

      const hidden = testHideGame(created.id);
      expect(hidden).toBe(true);

      const visibleGames = testGetAllGames(false);
      expect(visibleGames).toHaveLength(0);

      const allGames = testGetAllGames(true);
      expect(allGames).toHaveLength(1);
    });

    it('should return false for non-existent game', () => {
      const hidden = testHideGame(999);
      expect(hidden).toBe(false);
    });
  });

  describe('bulkInsertGames', () => {
    it('should insert multiple games at once', () => {
      const games: Omit<Game, 'id'>[] = [
        { title: 'Game 1', platform: 'PC', status: 'notStarted', hrsIn: 0, ttb: 0, hrsLeft: 0, rating: null, coop: false, coverUrl: null },
        { title: 'Game 2', platform: 'PS5', status: 'inProgress', hrsIn: 5, ttb: 10, hrsLeft: 5, rating: 8, coop: true, coverUrl: null },
        { title: 'Game 3', platform: 'Switch', status: 'beat', hrsIn: 20, ttb: 20, hrsLeft: 0, rating: 9, coop: false, coverUrl: 'http://example.com/cover.jpg' }
      ];

      const count = testBulkInsertGames(games);
      expect(count).toBe(3);

      const allGames = testGetAllGames();
      expect(allGames).toHaveLength(3);
    });
  });
});
