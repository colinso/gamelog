import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getValidAccessToken } from '$lib/server/epicAuth';

const LIB_URL = 'https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true';
const PLAYTIME_URL = (accountId: string) =>
  `https://library-service.live.use1a.on.epicgames.com/library/api/public/playtime/account/${accountId}/all`;
const CATALOG_URL = (namespace: string) =>
  `https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace/${namespace}/bulk/items`;

async function fetchCatalogTitles(
  namespace: string,
  items: { appName: string; catalogItemId: string }[],
  headers: Record<string, string>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const params = new URLSearchParams({ country: 'US', locale: 'en' });
    for (const item of items) params.append('id', item.catalogItemId);
    const res = await fetch(`${CATALOG_URL(namespace)}?${params}`, { headers });
    if (!res.ok) return map;
    const data = await res.json();
    for (const item of items) {
      const title = data[item.catalogItemId]?.title;
      if (title) map.set(item.appName, title);
    }
  } catch { /* non-fatal */ }
  return map;
}

export const GET: RequestHandler = async () => {
  let auth: { token: string; accountId: string };
  try {
    auth = await getValidAccessToken();
  } catch {
    throw error(503, 'Epic not connected');
  }

  const headers = { Authorization: `Bearer ${auth.token}` };

  const [libRes, ptRes] = await Promise.all([
    fetch(LIB_URL, { headers }),
    fetch(PLAYTIME_URL(auth.accountId), { headers }),
  ]);

  if (!libRes.ok) {
    console.error('[epic-sync] Library fetch failed', libRes.status);
    throw error(502, 'Failed to fetch Epic library');
  }

  const libData = await libRes.json();
  const records: any[] = libData.records ?? [];

  const playtimeMap = new Map<string, number>();
  if (ptRes.ok) {
    const ptData = await ptRes.json();
    if (Array.isArray(ptData)) {
      for (const p of ptData) {
        if (p.artifactId && p.totalTime) playtimeMap.set(p.artifactId, p.totalTime);
      }
    }
  } else {
    console.warn('[epic-sync] Playtime fetch failed', ptRes.status, '— continuing without hours');
  }

  // Step 1: Deduplicate by sandboxName (same as before), tracking the canonical record
  // per sandbox — prefer APPLICATION type, then highest playtime.
  type Canonical = { appName: string; namespace: string; catalogItemId: string; hrsIn: number };
  const bySandbox = new Map<string, Canonical>();
  for (const record of records) {
    const sandbox: string = record.sandboxName ?? record.appName;
    const hrsIn = Math.round(((playtimeMap.get(record.appName) ?? 0) / 3600) * 10) / 10;
    const existing = bySandbox.get(sandbox);
    const isApp = record.recordType === 'APPLICATION';
    const existingIsApp = existing?.appName && records.find(r => r.appName === existing.appName)?.recordType === 'APPLICATION';

    if (!existing || (!existingIsApp && isApp) || (existingIsApp === isApp && hrsIn > existing.hrsIn)) {
      bySandbox.set(sandbox, { appName: record.appName, namespace: record.namespace, catalogItemId: record.catalogItemId, hrsIn });
    }
  }

  // Step 2: Fetch catalog titles for the canonical records, batched by namespace
  const canonicals = Array.from(bySandbox.values());
  const byNamespace = new Map<string, { appName: string; catalogItemId: string }[]>();
  for (const c of canonicals) {
    if (!byNamespace.has(c.namespace)) byNamespace.set(c.namespace, []);
    byNamespace.get(c.namespace)!.push({ appName: c.appName, catalogItemId: c.catalogItemId });
  }

  const catalogTitles = new Map<string, string>();
  const namespaceGroups = Array.from(byNamespace.entries());
  for (let i = 0; i < namespaceGroups.length; i += 5) {
    const batch = namespaceGroups.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(([namespace, items]) => fetchCatalogTitles(namespace, items, headers))
    );
    for (const result of results) {
      for (const [appName, title] of result) catalogTitles.set(appName, title);
    }
  }

  // Step 3: Build final game list
  const games = Array.from(bySandbox.entries()).map(([sandbox, canonical]) => ({
    epicAppName: canonical.appName,
    title: catalogTitles.get(canonical.appName) ?? sandbox,
    hrsIn: canonical.hrsIn,
    status: canonical.hrsIn > 0 ? 'onShelf' : 'notStarted',
  }));

  return json(games);
};
