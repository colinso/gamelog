import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const { STEAM_API_KEY, STEAM_ACCOUNT_ID } = env;

  if (!STEAM_API_KEY || !STEAM_ACCOUNT_ID) {
    console.error('[steam-sync] Missing environment variables', {
      hasApiKey: Boolean(STEAM_API_KEY),
      hasAccountId: Boolean(STEAM_ACCOUNT_ID)
    });
    return json({ error: 'Steam credentials not configured' }, { status: 503 });
  }

  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ACCOUNT_ID}&format=json&include_appinfo=1`;
  console.info('[steam-sync] Requesting owned games', {
    steamAccountId: STEAM_ACCOUNT_ID,
    endpoint: 'IPlayerService/GetOwnedGames'
  });

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      console.error('[steam-sync] Steam API request failed', {
        status: res.status,
        statusText: res.statusText,
        responsePreview: body.slice(0, 500)
      });
      return json({ error: `Steam API request failed (${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.response?.games ?? [];
    console.info('[steam-sync] Steam API response received', { gameCount: raw.length });

    return json(
      raw.map((g: any) => ({
        steamAppId: g.appid,
        title: g.name,
        hrsIn: Math.round((g.playtime_forever / 60) * 10) / 10,
        coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        status: g.playtime_forever > 0 ? 'onShelf' : 'notStarted'
      }))
    );
  } catch (err) {
    console.error('[steam-sync] Unexpected server error during sync', err);
    return json({ error: 'Unexpected Steam sync error' }, { status: 500 });
  }
};
