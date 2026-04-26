import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function fetchHeaderImage(appid: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails/?appids=${appid}&filters=basic`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[appid]?.data?.header_image ?? null;
  } catch {
    return null;
  }
}

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
    const items = (data.items ?? [])
      .filter((g: any) => g.type === 'game' || g.type === 'app')
      .slice(0, 8);

    // Fetch proper header_image URLs in parallel for all results
    const headerImages = await Promise.all(items.map((g: any) => fetchHeaderImage(g.id)));

    return json(
      items.map((g: any, i: number) => ({
        steamAppId: g.id,
        title: g.name,
        coverUrl: headerImages[i] ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.id}/header.jpg`,
        thumbnail: g.tiny_image ?? null,
      }))
    );
  } catch (err) {
    console.error('[steam-search] Unexpected error', err);
    return json([]);
  }
};
