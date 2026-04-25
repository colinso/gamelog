<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { games, isSteamCover } from '../lib/stores';
  import { STATUS_GROUPS, STATUS_MAP } from '../lib/constants';
  import type { Game, Status } from '../lib/types';
  import SectionHead from '../lib/components/SectionHead.svelte';
  import GameCard from '../lib/components/GameCard.svelte';
  import NowPlayingCard from '../lib/components/NowPlayingCard.svelte';
  import AddModal from '../lib/components/AddModal.svelte';
  import DetailModal from '../lib/components/DetailModal.svelte';
  import SettingsModal from '../lib/components/SettingsModal.svelte';

  let filter: Status | 'all' = 'all';
  let search = '';
  let showAdd = false;
  let showSettings = false;
  let detail: Game | null = null;
  let fetchProgress: { done: number; total: number } | null = null;
  let ttbProgress: { done: number; total: number } | null = null;
  let steamSyncing = false;

  $: counts = $games.reduce((c, g) => { c[g.status] = (c[g.status] ?? 0) + 1; return c; }, {} as Record<string, number>);

  $: filtered = $games.filter(g => {
    if (filter !== 'all' && g.status !== filter) return false;
    if (search.trim()) return g.title.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  $: nowPlaying = $games.filter(g => g.status === 'inProgress');
  $: showNP = filter === 'all' && !search.trim() && nowPlaying.length > 0;

  $: grouped = (() => {
    if (filter !== 'all' || search.trim()) {
      const sg = STATUS_GROUPS.find(s => s.key === filter) ?? { label: 'Results', color: '#888', key: 'results' as any };
      return [{ ...sg, games: filtered }];
    }
    return STATUS_GROUPS
      .filter(sg => sg.key !== 'inProgress')
      .map(sg => ({ ...sg, games: $games.filter(g => g.status === sg.key) }))
      .filter(sg => sg.games.length > 0);
  })();

  async function syncSteam() {
    console.info('[steam-sync] Starting client sync');
    steamSyncing = true;
    try {
      const res = await fetch('/api/steam');
      if (!res.ok) {
        let message = `Steam sync failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
          console.error('[steam-sync] Server returned error', body);
        } catch (parseErr) {
          console.error('[steam-sync] Could not parse error response', parseErr);
        }
        console.error('[steam-sync] Sync request failed', { status: res.status, statusText: res.statusText });
        alert(message);
        return;
      }

      const steamGames = await res.json();
      if (!Array.isArray(steamGames)) {
        console.error('[steam-sync] Invalid payload shape', steamGames);
        alert('Steam sync returned an invalid payload. Check console logs for details.');
        return;
      }

      games.steamSync(steamGames);
      localStorage.setItem('steam_last_sync', new Date().toISOString());
      console.info('[steam-sync] Completed client sync', { importedCount: steamGames.length });
    } catch (err) {
      console.error('[steam-sync] Network/client error during sync', err);
      alert('Steam sync failed due to a network or client error. Check console logs for details.');
    } finally {
      steamSyncing = false;
    }
  }

  async function fetchMissingCovers(cancelled: () => boolean) {
    // Fetch RAWG covers for games with no cover or only a Steam CDN cover
    const missing = $games.filter(g => !g.coverUrl || isSteamCover(g.coverUrl));
    if (!missing.length) return;
    fetchProgress = { done: 0, total: missing.length };
    for (let i = 0; i < missing.length; i++) {
      if (cancelled()) break;
      const g = missing[i];
      try {
        const r = await fetch(`/api/rawg?q=${encodeURIComponent(g.title)}`);
        if (r.ok) {
          const results = await r.json();
          const img = results[0]?.coverUrl ?? null;
          if (img) await games.updateGame({ ...g, coverUrl: img });
        }
      } catch { /* ignore */ }
      fetchProgress = { done: i + 1, total: missing.length };
      if (i < missing.length - 1) await new Promise(r => setTimeout(r, 220));
    }
    fetchProgress = null;
  }

  async function fetchMissingTtb(cancelled: () => boolean) {
    const missing = $games.filter(g => g.ttb === 0);
    if (!missing.length) return;
    ttbProgress = { done: 0, total: missing.length };
    for (let i = 0; i < missing.length; i++) {
      if (cancelled()) break;
      const g = missing[i];
      try {
        const r = await fetch(`/api/hltb?q=${encodeURIComponent(g.title)}`);
        if (r.ok) {
          const results = await r.json();
          if (results[0]?.mainStory > 0) {
            const ttb = results[0].mainStory;
            await games.updateGame({
              ...g,
              ttb,
              hrsLeft: Math.max(0, ttb - g.hrsIn),
              status: g.hrsIn > ttb ? 'beat' : g.status
            });
          }
        }
      } catch { /* ignore */ }
      ttbProgress = { done: i + 1, total: missing.length };
      if (i < missing.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    ttbProgress = null;
  }

  onMount(() => {
    let dead = false;
    const cancelled = () => dead;
    (async () => {
      // Migrate from localStorage if exists
      const localData = localStorage.getItem('archive_v2');
      if (localData) {
        try {
          const parsed = JSON.parse(localData) as Game[];
          console.info('[migration] Found localStorage data, importing', { count: parsed.length });
          await fetch('/api/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
          });
          localStorage.removeItem('archive_v2');
          console.info('[migration] Migration complete, localStorage cleared');
        } catch (err) {
          console.error('[migration] Failed to migrate localStorage data', err);
        }
      }

      // Load games from API
      await games.load();

      // Auto-sync Steam if it's been more than an hour
      const lastSync = localStorage.getItem('steam_last_sync');
      const stale = !lastSync || Date.now() - new Date(lastSync).getTime() > 60 * 60 * 1000;
      if (stale) await syncSteam();

      await fetchMissingCovers(cancelled);
      await fetchMissingTtb(cancelled);
    })();
    return () => { dead = true; };
  });

</script>

<div class="page">
  <header>
    <div class="logo-wrap">
      <div class="logo">game<span>log</span></div>
      <div class="game-count">{$games.length} games in archive</div>
    </div>
    <div class="header-right">
      <div class="search-wrap">
        <span class="search-icon">⌕</span>
        <input class="search-input" bind:value={search} placeholder="search…" />
      </div>
      <button class="btn-util" on:click={() => showSettings = true}>⚙ settings</button>
      <button class="btn-add" on:click={() => showAdd = true}>+ new game</button>
    </div>
  </header>

  {#if steamSyncing}
    <div class="fetch-bar">
      <div class="fetch-track"><div class="fetch-fill" style="width:100%;opacity:0.5;animation:pulse 1s infinite alternate"></div></div>
      <span>syncing steam library…</span>
    </div>
  {:else if fetchProgress}
    <div class="fetch-bar">
      <div class="fetch-track"><div class="fetch-fill" style="width:{Math.round(fetchProgress.done/fetchProgress.total*100)}%"></div></div>
      <span>fetching covers {fetchProgress.done}/{fetchProgress.total}</span>
    </div>
  {:else if ttbProgress}
    <div class="fetch-bar">
      <div class="fetch-track"><div class="fetch-fill" style="width:{Math.round(ttbProgress.done/ttbProgress.total*100)}%"></div></div>
      <span>fetching times to beat {ttbProgress.done}/{ttbProgress.total}</span>
    </div>
  {/if}

  <nav class="filter-bar">
    <button class="ftab" class:active={filter === 'all'} on:click={() => filter = 'all'}>
      all<span class="badge">{$games.length}</span>
    </button>
    {#each STATUS_GROUPS as sg}
      {#if (counts[sg.key] ?? 0) > 0}
        <button
          class="ftab"
          class:active={filter === sg.key}
          style={filter === sg.key ? `border-color:${sg.color}55; color:${sg.color}` : ''}
          on:click={() => filter = sg.key}
        >
          <span class="dot" style="background:{sg.color}"></span>{sg.label.toLowerCase()}<span class="badge">{counts[sg.key]}</span>
        </button>
      {/if}
    {/each}
  </nav>

  {#if showNP}
    <section class="now-playing">
      <SectionHead label="Playing" color="#a3e635" count={nowPlaying.length} />
      <div class="np-grid">
        {#each nowPlaying as g (g.id)}
          <NowPlayingCard game={g} onClick={() => detail = g} />
        {/each}
      </div>
    </section>
  {/if}

  <div class="sections">
    {#each grouped as group (group.key)}
      <section class="section">
        <SectionHead label={group.label} color={group.color} count={group.games.length} />
        {#if group.games.length === 0}
          <div class="empty">nothing here yet</div>
        {:else}
          <div class="card-grid">
            {#each group.games as g (g.id)}
              <GameCard game={g} onClick={() => detail = g} />
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>

{#if showSettings}
  <SettingsModal
    onClose={() => showSettings = false}
    games={$games}
    onImport={(imported, merge) => games.import(imported, merge)}
    onSteamSync={syncSteam}
    {steamSyncing}
  />
{/if}

{#if showAdd}
  <AddModal onClose={() => showAdd = false} onAdd={g => games.add(g)} />
{/if}

{#if detail}
  <DetailModal
    game={detail}
    onClose={() => detail = null}
    onUpdate={async g => { await games.updateGame(g); detail = g; }}
    onDelete={async id => { await games.delete(id); detail = null; }}
  />
{/if}

<style>
  .page { max-width: 1440px; margin: 0 auto; padding: 0 64px 100px; }

  header {
    padding: 52px 0 40px;
    display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
  }
  .logo { font-size: 26px; font-weight: 600; letter-spacing: -1px; line-height: 1; }
  .logo span { color: var(--accent); }
  .game-count { font-size: 11px; color: var(--t3); margin-top: 3px; margin-left: 2px; }
  .header-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  .search-wrap { position: relative; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--t3); font-size: 12px; pointer-events: none; }
  .search-input {
    background: transparent; border: 1px solid var(--border2);
    padding: 8px 12px 8px 32px; color: var(--text);
    font-family: var(--mono); font-size: 12px; width: 200px; transition: .2s;
  }
  .search-input:focus { outline: none; border-color: var(--accent); width: 240px; }
  .search-input::placeholder { color: var(--t3); }

  .btn-group { display: flex; gap: 6px; }
  .btn-util {
    background: var(--s2); border: 1px solid var(--border2); color: var(--t2);
    padding: 6px 10px; font-family: var(--mono); font-size: 11px; cursor: pointer; transition: .15s;
  }
  .btn-util:hover { color: var(--text); }
  .btn-add {
    background: var(--accent); color: #111;
    padding: 8px 16px; font-family: var(--mono);
    font-size: 12px; font-weight: 600; letter-spacing: .3px; transition: .15s; white-space: nowrap; border: none; cursor: pointer;
  }
  .btn-add:hover { background: #b9f264; }

  .fetch-bar {
    padding: 8px 0; border-bottom: 1px solid var(--border);
    font-size: 10px; color: var(--t2); display: flex; align-items: center; gap: 10px;
  }
  .fetch-track { flex: 1; height: 2px; background: var(--s3); overflow: hidden; }
  .fetch-fill { height: 100%; background: var(--accent); transition: .3s; }
  @keyframes pulse { from { opacity: 0.3; } to { opacity: 0.8; } }

  .filter-bar {
    display: flex; gap: 2px; padding: 18px 0 0;
    overflow-x: auto; scrollbar-width: none;
  }
  .filter-bar::-webkit-scrollbar { display: none; }
  .ftab {
    background: transparent; border: 1px solid transparent;
    padding: 5px 12px; font-size: 11px; color: var(--t2);
    white-space: nowrap; transition: .15s; letter-spacing: .2px;
    font-family: var(--mono); cursor: pointer;
  }
  .ftab:hover { color: var(--text); border-color: var(--border); }
  .ftab.active { color: var(--text); border-color: var(--border2); background: var(--s2); }
  .dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
  .badge { background: var(--s2); padding: 1px 5px; font-size: 9px; margin-left: 4px; color: var(--t2); border: 1px solid var(--border); }

  .now-playing { padding: 32px 0 0; }
  .np-grid { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
  .np-grid::-webkit-scrollbar { display: none; }

  .sections { padding-top: 12px; }
  .section { margin-top: 44px; }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .empty { padding: 60px 0; text-align: center; color: var(--t3); font-size: 12px; }

  @media (max-width: 768px) {
    .page { padding: 0 24px 80px; }
    .card-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
