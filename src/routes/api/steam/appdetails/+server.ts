import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const appid = url.searchParams.get('appid');
  if (!appid || isNaN(Number(appid))) {
    return json({ error: 'missing appid' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails/?appids=${appid}&filters=basic`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) {
      console.error('[steam-appdetails] appdetails fetch failed', { status: res.status, appid });
      return json({ error: 'upstream error' }, { status: 502 });
    }

    const data = await res.json();
    const appData = data?.[appid];

    if (!appData?.success || !appData?.data) {
      console.warn('[steam-appdetails] no data for appid', appid);
      return json({ error: 'not found' }, { status: 404 });
    }

    return json({
      steamAppId: Number(appid),
      title: appData.data.name ?? null,
      header_image: appData.data.header_image ?? null,
    });
  } catch (err) {
    console.error('[steam-appdetails] Unexpected error', err);
    return json({ error: 'internal error' }, { status: 500 });
  }
};
