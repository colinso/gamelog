import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import MoonApi from 'nxapi/moon';

export const GET: RequestHandler = async () => {
  const { SWITCH_SESSION_TOKEN, SWITCH_DEVICE_ID, SWITCH_PLAYER_NAME } = env;

  if (!SWITCH_SESSION_TOKEN || !SWITCH_DEVICE_ID) {
    return json({ error: 'Nintendo Switch credentials not configured' }, { status: 503 });
  }

  try {
    const { moon } = await MoonApi.createWithSessionToken(SWITCH_SESSION_TOKEN);
    const { data: dailyData } = await moon.getDailySummaries(SWITCH_DEVICE_ID);
    const summaries = dailyData.items;

    // Build applicationId → { title, imageUri } from device-level playedApps
    const titleMap = new Map<string, { title: string; imageUri: string }>();
    for (const day of summaries) {
      for (const app of day.playedApps) {
        if (!titleMap.has(app.applicationId)) {
          titleMap.set(app.applicationId, {
            title: app.title,
            imageUri: app.imageUri.large,
          });
        }
      }
    }

    // Aggregate playtime per applicationId for the target player
    const playtimeMs = new Map<string, number>();
    for (const day of summaries) {
      const player = SWITCH_PLAYER_NAME
        ? day.devicePlayers.find(p => p.nickname === SWITCH_PLAYER_NAME)
        : day.devicePlayers[0] ?? null;
      if (!player) continue;
      for (const app of player.playedApps) {
        playtimeMs.set(app.applicationId, (playtimeMs.get(app.applicationId) ?? 0) + app.playingTime);
      }
    }

    const games = [];
    for (const [appId, totalMs] of playtimeMs) {
      const info = titleMap.get(appId);
      if (!info) continue;
      games.push({
        switchAppId: appId,
        title: info.title,
        hrsIn: Math.round((totalMs / 3_600_000) * 10) / 10,
        coverUrl: info.imageUri,
        status: 'onShelf',
      });
    }

    console.info('[switch-sync] Fetched Switch games', { count: games.length });
    return json(games);
  } catch (err) {
    console.error('[switch-sync] Unexpected error during sync', err);
    return json({ error: 'Unexpected Switch sync error' }, { status: 500 });
  }
};
