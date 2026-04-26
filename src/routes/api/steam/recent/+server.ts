import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const { STEAM_API_KEY, STEAM_ACCOUNT_ID } = env;

  if (!STEAM_API_KEY || !STEAM_ACCOUNT_ID) {
    console.error('[steam-recent] Missing environment variables', {
      hasApiKey: Boolean(STEAM_API_KEY),
      hasAccountId: Boolean(STEAM_ACCOUNT_ID)
    });
    return json({ error: 'Steam credentials not configured' }, { status: 503 });
  }

  const url = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ACCOUNT_ID}&format=json`;
  console.info('[steam-recent] Requesting recently played games', {
    steamAccountId: STEAM_ACCOUNT_ID,
    endpoint: 'IPlayerService/GetRecentlyPlayedGames'
  });

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      console.error('[steam-recent] Steam API request failed', {
        status: res.status,
        statusText: res.statusText,
        responsePreview: body.slice(0, 500)
      });
      return json({ error: `Steam API request failed (${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.response?.games ?? [];
    console.info('[steam-recent] Steam API response received', { gameCount: raw.length });

    return json(
      raw.map((g: any) => ({
        steamAppId: g.appid,
        title: g.name,
        hrsIn: Math.round((g.playtime_forever / 60) * 10) / 10,
        coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        status: 'inProgress', // recently played = actively playing
      }))
    );
  } catch (err) {
    console.error('[steam-recent] Unexpected server error', err);
    return json({ error: 'Unexpected Steam recent-games error' }, { status: 500 });
  }
};
