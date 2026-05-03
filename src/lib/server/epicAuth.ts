import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';

// Publicly known launcher client credentials — hardcoded in every community Epic launcher
const CLIENT_ID = '34a02cf8f4414e29b15921876da36f9a';
const CLIENT_SECRET = 'daafbccc737745039dffe53d94fc76cf';
const BASIC_AUTH = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
const TOKEN_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';

const AUTH_PATH = process.env.EPIC_AUTH_PATH || join(process.cwd(), 'data', 'epic-auth.json');

type EpicTokens = {
  accessToken: string;
  refreshToken: string;
  accountId: string;
  displayName: string;
  expiresAt: string;
};

export function loadTokens(): EpicTokens | null {
  try {
    if (!existsSync(AUTH_PATH)) return null;
    return JSON.parse(readFileSync(AUTH_PATH, 'utf-8')) as EpicTokens;
  } catch {
    return null;
  }
}

function saveTokens(tokens: EpicTokens): void {
  const dir = dirname(AUTH_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(AUTH_PATH, JSON.stringify(tokens, null, 2));
}

export function clearTokens(): void {
  try {
    if (existsSync(AUTH_PATH)) rmSync(AUTH_PATH);
  } catch { /* ignore */ }
}

async function fetchTokens(body: Record<string, string>): Promise<EpicTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${BASIC_AUTH}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ ...body, token_type: 'eg1' }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Epic OAuth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accountId: data.account_id,
    expiresAt,
  };
}

// Import credentials from legendary's user.json format.
export function importLegendaryCredentials(raw: any): EpicTokens {
  if (!raw.access_token || !raw.refresh_token || !raw.account_id) {
    throw new Error('Missing required fields — make sure you pasted the full user.json content');
  }
  const expiresAt = raw.expires_at ?? new Date(Date.now() + (raw.expires_in ?? 7200) * 1000).toISOString();
  const tokens: EpicTokens = {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    accountId: raw.account_id,
    displayName: raw.displayName ?? raw.account_id,
    expiresAt,
  };
  saveTokens(tokens);
  return tokens;
}

async function refreshAccessToken(refreshToken: string): Promise<EpicTokens> {
  const tokens = await fetchTokens({ grant_type: 'refresh_token', refresh_token: refreshToken });
  saveTokens(tokens);
  return tokens;
}

export async function getValidAccessToken(): Promise<{ token: string; accountId: string }> {
  let stored = loadTokens();
  if (!stored) throw new Error('Epic not connected');

  const expiresAt = new Date(stored.expiresAt).getTime();
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() > expiresAt - fiveMinutes) {
    stored = await refreshAccessToken(stored.refreshToken);
  }

  return { token: stored.accessToken, accountId: stored.accountId };
}
