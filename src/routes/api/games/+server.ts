import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getAllGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  bulkInsertGames,
  hideGame
} from '$lib/server/db';
import type { Game } from '$lib/types';

// GET /api/games?includeHidden=true - Get all games
export const GET: RequestHandler = async ({ url }) => {
  try {
    const includeHidden = url.searchParams.get('includeHidden') === 'true';
    const games = getAllGames(includeHidden);
    return json(games);
  } catch (err) {
    console.error('[games] Failed to fetch games:', err);
    throw error(500, 'Failed to fetch games');
  }
};

// POST /api/games - Create a new game
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Bulk import (for migration from localStorage)
    if (Array.isArray(body)) {
      const count = bulkInsertGames(body);
      return json({ imported: count }, { status: 201 });
    }

    // Single game create
    const game = createGame(body as Omit<Game, 'id'>);
    return json(game, { status: 201 });
  } catch (err) {
    console.error('[games] Failed to create game:', err);
    throw error(400, 'Invalid game data');
  }
};

// PATCH /api/games - Update a game
export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { id, ...updates } = await request.json();

    if (!id) throw error(400, 'Missing game ID');

    const updated = updateGame(id, updates);
    if (!updated) throw error(404, 'Game not found');

    return json(updated);
  } catch (err: any) {
    if (err.status) throw err;
    console.error('[games] Failed to update game:', err);
    throw error(400, 'Invalid update data');
  }
};

// PUT /api/games/hide - Hide a game (keep in DB but exclude from view)
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) throw error(400, 'Missing game ID');

    const hidden = hideGame(id);
    if (!hidden) throw error(404, 'Game not found');

    return json({ success: true });
  } catch (err: any) {
    if (err.status) throw err;
    console.error('[games] Failed to hide game:', err);
    throw error(400, 'Invalid request');
  }
};

// DELETE /api/games - Delete a game
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) throw error(400, 'Missing game ID');

    const deleted = deleteGame(id);
    if (!deleted) throw error(404, 'Game not found');

    return json({ success: true });
  } catch (err: any) {
    if (err.status) throw err;
    console.error('[games] Failed to delete game:', err);
    throw error(400, 'Invalid request');
  }
};
