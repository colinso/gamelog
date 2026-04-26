import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Game } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database location
const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'gamelog.db');

// Initialize database
let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dataDir = dirname(DB_PATH);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Better concurrency

    // Run schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);
  }
  return db;
}

// Type mapping: DB row -> Game interface
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
  created_at: string;
  updated_at: string;
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
    hidden: Boolean(row.hidden),
  };
}

function gameToDb(game: Partial<Game>): Partial<DbGame> {
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
    hidden: game.hidden ? 1 : 0,
  };
}

// CRUD operations

export function getAllGames(includeHidden = false): Game[] {
  const database = getDb();
  const query = includeHidden
    ? 'SELECT * FROM games ORDER BY updated_at DESC'
    : 'SELECT * FROM games WHERE hidden = 0 ORDER BY updated_at DESC';
  const rows = database.prepare(query).all() as DbGame[];
  return rows.map(dbToGame);
}

export function getGameById(id: number): Game | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM games WHERE id = ?').get(id) as DbGame | undefined;
  return row ? dbToGame(row) : null;
}

export function createGame(game: Omit<Game, 'id'>): Game {
  const database = getDb();
  const dbGame = gameToDb(game);
  const stmt = database.prepare(`
    INSERT INTO games (title, platform, status, hrs_in, ttb, hrs_left, rating, coop, notes, cover_url, steam_app_id)
    VALUES (@title, @platform, @status, @hrs_in, @ttb, @hrs_left, @rating, @coop, @notes, @cover_url, @steam_app_id)
  `);
  const info = stmt.run(dbGame);
  return { ...game, id: Number(info.lastInsertRowid) };
}

export function updateGame(id: number, updates: Partial<Game>): Game | null {
  const database = getDb();
  const existing = getGameById(id);
  if (!existing) return null;

  // Never let a PATCH override hidden — use hideGame() for that
  const { hidden: _ignored, ...safeUpdates } = updates;
  const merged = { ...existing, ...safeUpdates };
  const dbGame = gameToDb(merged);

  const stmt = database.prepare(`
    UPDATE games SET
      title = @title,
      platform = @platform,
      status = @status,
      hrs_in = @hrs_in,
      ttb = @ttb,
      hrs_left = @hrs_left,
      rating = @rating,
      coop = @coop,
      notes = @notes,
      cover_url = @cover_url,
      steam_app_id = @steam_app_id
    WHERE id = @id
  `);
  stmt.run({ ...dbGame, id });
  return merged;
}

export function deleteGame(id: number): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM games WHERE id = ?');
  const info = stmt.run(id);
  return info.changes > 0;
}

export function hideGame(id: number): boolean {
  const database = getDb();
  const stmt = database.prepare('UPDATE games SET hidden = 1 WHERE id = ?');
  const info = stmt.run(id);
  return info.changes > 0;
}

export function deleteAllGames(): number {
  const database = getDb();
  const info = database.prepare('DELETE FROM games').run();
  return info.changes;
}

export function bulkInsertGames(games: Omit<Game, 'id'>[]): number {
  const database = getDb();

  // Never create a duplicate entry for a steamAppId that already exists (hidden or not)
  const existingAppIds = new Set<number>(
    (database.prepare('SELECT steam_app_id FROM games WHERE steam_app_id IS NOT NULL').all() as { steam_app_id: number }[])
      .map(r => r.steam_app_id)
  );
  const toInsert = games.filter(g => !g.steamAppId || !existingAppIds.has(g.steamAppId));
  if (toInsert.length === 0) return 0;

  const stmt = database.prepare(`
    INSERT INTO games (title, platform, status, hrs_in, ttb, hrs_left, rating, coop, notes, cover_url, steam_app_id, hidden)
    VALUES (@title, @platform, @status, @hrs_in, @ttb, @hrs_left, @rating, @coop, @notes, @cover_url, @steam_app_id, @hidden)
  `);

  const insertMany = database.transaction((games: Omit<Game, 'id'>[]) => {
    for (const game of games) {
      stmt.run(gameToDb(game));
    }
  });

  insertMany(toInsert);
  return toInsert.length;
}
