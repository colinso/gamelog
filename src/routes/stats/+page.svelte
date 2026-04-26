<script lang="ts">
  import { onMount } from 'svelte';
  import { fmt } from '../../lib/utils';
  import { STATUS_GROUPS } from '../../lib/constants';
  import type { Game } from '../../lib/types';

  let games: Game[] = [];
  let loading = true;

  onMount(async () => {
    const res = await fetch('/api/games');
    if (res.ok) games = await res.json();
    loading = false;
  });

  // Hours left in progress
  $: inProgress = games.filter(g => g.status === 'inProgress');
  $: hoursLeftPlaying = inProgress.reduce((sum, g) => sum + (g.hrsLeft ?? 0), 0);

  // Hours left across full backlog (everything not beaten or abandoned)
  $: backlog = games.filter(g => g.status !== 'beat' && g.status !== 'abandoned');
  $: hoursLeftBacklog = backlog.reduce((sum, g) => sum + (g.hrsLeft ?? 0), 0);

  // Beat rate
  $: beaten = games.filter(g => g.status === 'beat').length;
  $: abandoned = games.filter(g => g.status === 'abandoned').length;
  $: beatRate = (beaten + abandoned) > 0 ? Math.round((beaten / (beaten + abandoned)) * 100) : null;

  // Library by status
  $: byStatus = STATUS_GROUPS.map(sg => ({
    ...sg,
    count: games.filter(g => g.status === sg.key).length,
  })).filter(sg => sg.count > 0);
  $: maxStatusCount = Math.max(...byStatus.map(s => s.count), 1);

  // Rating distribution
  $: rated = games.filter(g => g.rating != null);
  $: ratingDist = [1, 2, 3, 4, 5].map(r => ({
    stars: r,
    count: rated.filter(g => g.rating === r).length,
  }));
  $: maxRating = Math.max(...ratingDist.map(r => r.count), 1);
  $: avgRating = rated.length > 0
    ? (rated.reduce((s, g) => s + g.rating!, 0) / rated.length).toFixed(1)
    : null;
</script>

<div class="page">
  <header>
    <div class="logo-wrap">
      <a href="/" class="logo-btn">
        <div class="logo">gamelog</div>
      </a>
      <div class="page-title">stats</div>
    </div>
    <a href="/" class="btn-back">← library</a>
  </header>

  {#if loading}
    <div class="loading">loading…</div>
  {:else}
    <div class="dashboard">

      <!-- Hours left row -->
      <div class="stat-card accent">
        <div class="stat-label">hours left playing</div>
        <div class="stat-big">{fmt(hoursLeftPlaying)}h</div>
        <div class="stat-sub">across {inProgress.length} game{inProgress.length === 1 ? '' : 's'} in progress</div>
      </div>

      <div class="stat-card secondary">
        <div class="stat-label">hours left in backlog</div>
        <div class="stat-mid">{fmt(hoursLeftBacklog)}h</div>
        <div class="stat-sub">{backlog.length} games not yet beaten or abandoned</div>
      </div>

      <div class="stat-row">
        <!-- Beat rate -->
        <div class="stat-card">
          <div class="stat-label">beat rate</div>
          {#if beatRate !== null}
            <div class="stat-big">{beatRate}%</div>
            <div class="stat-sub">{beaten} beaten · {abandoned} abandoned</div>
            <div class="beat-bar-track">
              <div class="beat-bar-fill" style="width:{beatRate}%"></div>
            </div>
          {:else}
            <div class="stat-empty">no data yet</div>
          {/if}
        </div>

        <!-- Total library -->
        <div class="stat-card">
          <div class="stat-label">library</div>
          <div class="stat-big">{games.length}</div>
          <div class="stat-sub">games tracked</div>
        </div>
      </div>

      <!-- Library by status -->
      <div class="stat-card">
        <div class="stat-label">by status</div>
        <div class="status-bars">
          {#each byStatus as s}
            <div class="status-row">
              <div class="status-name">{s.label}</div>
              <div class="status-bar-track">
                <div
                  class="status-bar-fill"
                  style="width:{Math.round((s.count / maxStatusCount) * 100)}%; background:{s.color}"
                ></div>
              </div>
              <div class="status-count">{s.count}</div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Rating distribution -->
      <div class="stat-card">
        <div class="stat-label">
          ratings
          {#if avgRating}<span class="avg-label">avg {avgRating} · {rated.length} rated</span>{/if}
        </div>
        {#if rated.length > 0}
          <div class="rating-bars">
            {#each ratingDist as r}
              <div class="rating-col">
                <div class="rating-bar-wrap">
                  <div
                    class="rating-bar-fill"
                    style="height:{Math.round((r.count / maxRating) * 100)}%"
                  ></div>
                </div>
                <div class="rating-label">{'★'.repeat(r.stars)}</div>
                <div class="rating-count">{r.count}</div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="stat-empty">no ratings yet</div>
        {/if}
      </div>

    </div>
  {/if}
</div>

<style>
  :global(body) { margin: 0; }

  .page {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
  }

  .logo-wrap { display: flex; align-items: baseline; gap: 12px; }
  .logo-btn { text-decoration: none; background: none; border: none; padding: 0; cursor: pointer; }
  .logo { font-size: 18px; font-weight: 700; color: var(--accent); letter-spacing: -0.5px; }
  .page-title { font-size: 11px; color: var(--t3); letter-spacing: 2px; text-transform: uppercase; }

  .btn-back {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--t2);
    text-decoration: none;
    transition: .15s;
  }
  .btn-back:hover { color: var(--text); }

  .loading { padding: 60px; text-align: center; color: var(--t3); font-size: 12px; }

  .dashboard {
    max-width: 680px;
    margin: 0 auto;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .stat-card {
    background: var(--s1);
    border: 1px solid var(--border);
    padding: 18px 20px;
  }
  .stat-card.accent { border-color: var(--accent); }
  .stat-card.secondary { background: transparent; }
  .stat-mid {
    font-size: 24px;
    font-weight: 600;
    color: var(--t2);
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .stat-label {
    font-size: 9px;
    font-weight: 600;
    color: var(--t2);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stat-big {
    font-size: 36px;
    font-weight: 700;
    color: var(--text);
    line-height: 1;
    margin-bottom: 6px;
  }
  .stat-card.accent .stat-big { color: var(--accent); }

  .stat-sub { font-size: 10px; color: var(--t3); }
  .stat-empty { font-size: 11px; color: var(--t3); padding: 8px 0; }

  /* Beat rate bar */
  .beat-bar-track { background: var(--s3); height: 3px; margin-top: 12px; }
  .beat-bar-fill { height: 100%; background: var(--c-beat, #4ade80); transition: width .4s; }

  /* Status bars */
  .status-bars { display: flex; flex-direction: column; gap: 8px; }
  .status-row { display: flex; align-items: center; gap: 10px; }
  .status-name { font-size: 10px; color: var(--t2); width: 90px; flex-shrink: 0; }
  .status-bar-track { flex: 1; background: var(--s3); height: 6px; }
  .status-bar-fill { height: 100%; transition: width .4s; }
  .status-count { font-size: 10px; color: var(--t3); width: 24px; text-align: right; flex-shrink: 0; }

  /* Rating bars */
  .rating-bars {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    height: 80px;
    padding-top: 8px;
  }
  .rating-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; height: 100%; }
  .rating-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; background: var(--s3); }
  .rating-bar-fill { width: 100%; background: var(--accent); transition: height .4s; min-height: 2px; }
  .rating-label { font-size: 8px; color: #facc15; letter-spacing: -1px; }
  .rating-count { font-size: 9px; color: var(--t2); }

  .avg-label { font-size: 9px; color: var(--t3); font-weight: 400; letter-spacing: 0; text-transform: none; }

  @media (max-width: 480px) {
    .stat-row { grid-template-columns: 1fr; }
    header { padding: 12px 16px; }
    .dashboard { padding: 16px 12px; }
  }
</style>
