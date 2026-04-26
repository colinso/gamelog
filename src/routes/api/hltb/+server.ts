import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

let tokenCache: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires) return tokenCache.token;
  const { IGDB_CLIENT_ID, IGDB_CLIENT_SECRET } = env;
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('Failed to get IGDB token');
  const data = await res.json();
  tokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

async function igdb(endpoint: string, body: string, token: string) {
  const { IGDB_CLIENT_ID } = env;
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': IGDB_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body,
  });
  if (!res.ok) throw new Error(`IGDB ${endpoint} returned ${res.status}`);
  return res.json();
}

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim();
  if (!q) throw error(400, 'Missing query');

  let token: string;
  try {
    token = await getToken();
  } catch {
    throw error(502, 'Failed to authenticate with IGDB');
  }

  const games = await igdb('games', `search "${q}"; fields id,name; limit 5;`, token);
  if (!games.length) return json([]);

  const ids = games.map((g: any) => g.id).join(',');
  const ttbs = await igdb('game_time_to_beats', `where game_id = (${ids}); fields game_id,hastily,normally,completely,count;`, token);

  const ttbMap: Record<number, any> = Object.fromEntries(ttbs.map((t: any) => [t.game_id, t]));

  return json(games.map((g: any) => {
    const t = ttbMap[g.id];
    return {
      id: String(g.id),
      name: g.name,
      mainStory: t?.hastily  ? Math.round(t.hastily   / 3600) : 0,
      mainExtra: t?.normally ? Math.round(t.normally  / 3600) : 0,
      completionist: t?.completely ? Math.round(t.completely / 3600) : 0,
      hasTtb: !!t,
    };
  }).filter((g: any) => g.hasTtb));
};
