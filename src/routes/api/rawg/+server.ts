import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim();
  if (!q) throw error(400, 'Missing query');

  const { RAWG_API_KEY } = env;
  if (!RAWG_API_KEY) {
    console.error('[rawg] Missing RAWG_API_KEY environment variable');
    throw error(503, 'RAWG API not configured');
  }

  const abort = new AbortController();
  const tid = setTimeout(() => abort.abort(), 8000);

  try {
    const res = await fetch(
      `https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&key=${RAWG_API_KEY}&page_size=5&search_precise=true`,
      { signal: abort.signal }
    );
    clearTimeout(tid);

    if (!res.ok) {
      console.error('[rawg] RAWG API request failed', { status: res.status, statusText: res.statusText });
      throw error(502, 'RAWG API request failed');
    }

    const data = await res.json();
    const results = (data.results ?? []).map((g: any) => ({
      id: g.id,
      title: g.name,
      coverUrl: g.background_image,
      released: g.released,
    }));

    return json(results);
  } catch (err: any) {
    clearTimeout(tid);
    if (err.name === 'AbortError') return json([]);
    if (err.status) throw err;
    console.error('[rawg] Unexpected error during RAWG search', err);
    throw error(500, 'RAWG search failed');
  }
};
