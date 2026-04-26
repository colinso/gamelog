<script lang="ts">
  export let onSelect: (result: { steamAppId: number; title: string; coverUrl: string }) => void;

  let query = '';
  let results: { steamAppId: number; title: string; coverUrl: string; thumbnail: string | null }[] = [];
  let loading = false;
  let timer: ReturnType<typeof setTimeout>;

  function search(q: string) {
    query = q;
    results = [];
    if (q.length < 2) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      loading = true;
      try {
        const r = await fetch(`/api/steam/search?q=${encodeURIComponent(q)}`);
        results = r.ok ? await r.json() : [];
      } catch { results = []; }
      loading = false;
    }, 400);
  }

  function pick(r: typeof results[0]) {
    query = '';
    results = [];
    onSelect({ steamAppId: r.steamAppId, title: r.title, coverUrl: r.coverUrl });
  }
</script>

<div class="wrap">
  <input
    class="form-input"
    value={query}
    on:input={e => search(e.currentTarget.value)}
    placeholder="Search Steam store…"
  />
  {#if loading || results.length > 0}
    <div class="results">
      {#if loading}<div class="loading">searching…</div>{/if}
      {#each results as r}
        <button type="button" class="result" on:click={() => pick(r)}>
          {#if r.thumbnail}
            <img src={r.thumbnail} alt="" class="thumb" />
          {:else}
            <div class="thumb-placeholder"></div>
          {/if}
          <span class="name">{r.title}</span>
          <span class="appid">{r.steamAppId}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrap { position: relative; }
  .results {
    background: var(--s2);
    border: 1px solid var(--border2);
    border-top: none;
    max-height: 220px;
    overflow-y: auto;
    position: absolute;
    left: 0; right: 0;
    z-index: 50;
  }
  .result {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: .15s;
  }
  .result:hover { background: var(--s3); }
  .result:last-child { border-bottom: none; }
  .thumb { width: 48px; height: 27px; object-fit: cover; flex-shrink: 0; background: var(--s3); }
  .thumb-placeholder { width: 48px; height: 27px; flex-shrink: 0; background: var(--s3); }
  .name { font-size: 11px; color: var(--text); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .appid { font-size: 9px; color: var(--t3); font-family: var(--mono); flex-shrink: 0; }
  .loading { padding: 12px; font-size: 11px; color: var(--t3); text-align: center; }
  .form-input {
    width: 100%;
    background: var(--s2);
    border: 1px solid var(--border2);
    padding: 8px 11px;
    color: var(--text);
    font-family: var(--mono);
    font-size: 12px;
    transition: .2s;
  }
  .form-input:focus { outline: none; border-color: var(--accent); }
</style>
