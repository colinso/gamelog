import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadTokens, clearTokens, importLegendaryCredentials } from '$lib/server/epicAuth';

// GET /api/epic/auth — connection status
export const GET: RequestHandler = async () => {
  const tokens = loadTokens();
  if (!tokens) return json({ connected: false });
  return json({ connected: true, accountId: tokens.accountId, displayName: tokens.displayName ?? tokens.accountId });
};

// POST /api/epic/auth — import legendary user.json credentials
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const tokens = importLegendaryCredentials(body);
    return json({ connected: true, accountId: tokens.accountId, displayName: tokens.displayName ?? tokens.accountId });
  } catch (err: any) {
    if (err.status) throw err;
    throw error(400, err.message ?? 'Invalid credentials');
  }
};

// DELETE /api/epic/auth — disconnect
export const DELETE: RequestHandler = async () => {
  clearTokens();
  return json({ connected: false });
};
