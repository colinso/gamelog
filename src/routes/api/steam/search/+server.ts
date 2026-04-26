import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim();
  if (!q) return json([]);

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=US`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) {
      console.error('[steam-search] Store search failed', { status: res.status });
      return json([]);
    }

    const data = await res.json();
    const items = (data.items ?? []).filter((g: any) => g.type === 'game' || g.type === 'app');

    return json(
      items.slice(0, 8).map((g: any) => ({
        steamAppId: g.id,
        title: g.name,
        coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.id}/header.jpg`,
        thumbnail: g.tiny_image ?? null,
      }))
    );
  } catch (err) {
    console.error('[steam-search] Unexpected error', err);
    return json([]);
  }
};
