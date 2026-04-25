<script lang="ts">
  import { RAWG_KEY } from '../constants';

  export let onSelect: (sel: { title: string; coverUrl: string | null; ttb: number }) => void;

  let query = '';
  let results: any[] = [];
  let loading = false;
  let selected: { title: string; coverUrl: string | null } | null = null;
  let timer: ReturnType<typeof setTimeout>;

  // HLTB state
  let hltbResults: { id: string; name: string; mainStory: number; mainExtra: number; completionist: number }[] = [];
  let hltbLoading = false;
  let chosenTtb = 0;
  let ttbSource: 'main' | 'extra' | 'completionist' | 'rawg' = 'main';

  function search(q: string) {
    query = q;
    if (q.length < 2) { results = []; return; }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      loading = true;
      try {
        const r = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&key=${RAWG_KEY}&page_size=6&search_precise=true`);
        const d = await r.json();
        results = d.results ?? [];
      } catch { results = []; }
      loading = false;
    }, 400);
  }

  async function pick(r: any) {
    selected = { title: r.name, coverUrl: r.background_image ?? null };
    query = '';
    results = [];
    chosenTtb = 0;
    hltbResults = [];
    ttbSource = 'main';
    onSelect({ title: r.name, coverUrl: r.background_image ?? null, ttb: 0 });

    hltbLoading = true;
    try {
      const res = await fetch(`/api/hltb?q=${encodeURIComponent(r.name)}`);
      if (res.ok) {
        hltbResults = await res.json();
        if (hltbResults.length > 0) {
          chosenTtb = hltbResults[0].mainStory;
          ttbSource = 'main';
          onSelect({ title: r.name, coverUrl: r.background_image ?? null, ttb: chosenTtb });
        }
      }
    } catch {}
    hltbLoading = false;
  }

  function pickTtb(source: typeof ttbSource, val: number) {
    ttbSource = source;
    chosenTtb = val;
    if (selected) onSelect({ title: selected.title, coverUrl: selected.coverUrl, ttb: val });
  }

  function pickHltbGame(h: typeof hltbResults[0]) {
    chosenTtb = h.mainStory;
    ttbSource = 'main';
    hltbResults = [h];
    if (selected) onSelect({ title: selected.title, coverUrl: selected.coverUrl, ttb: chosenTtb });
  }

  function clear() {
    selected = null;
    hltbResults = [];
    chosenTtb = 0;
    onSelect({ title: '', coverUrl: null, ttb: 0 });
  }
</script>

{#if selected}
  <div class="selected">
    {#if selected.coverUrl}<img src={selected.coverUrl} alt="" class="sel-img" />{/if}
    <div class="sel-info">
      <div class="sel-name">{selected.title}</div>
      {#if hltbLoading}
        <div class="hltb-loading">fetching times…</div>
      {:else if hltbResults.length > 1}
        <div class="hltb-multi-label">Multiple matches — pick one:</div>
        <div class="hltb-multi">
          {#each hltbResults.slice(0, 4) as h}
            <button class="hltb-game-btn" on:click={() => pickHltbGame(h)}>{h.name}</button>
          {/each}
        </div>
      {:else if hltbResults.length === 1}
        <div class="ttb-row">
          <button class="ttb-chip" class:active={ttbSource === 'main'} on:click={() => pickTtb('main', hltbResults[0].mainStory)}>
            main {hltbResults[0].mainStory}h
          </button>
          {#if hltbResults[0].mainExtra > 0}
            <button class="ttb-chip" class:active={ttbSource === 'extra'} on:click={() => pickTtb('extra', hltbResults[0].mainExtra)}>
              +extras {hltbResults[0].mainExtra}h
            </button>
          {/if}
          {#if hltbResults[0].completionist > 0}
            <button class="ttb-chip" class:active={ttbSource === 'completionist'} on:click={() => pickTtb('completionist', hltbResults[0].completionist)}>
              100% {hltbResults[0].completionist}h
            </button>
          {/if}
        </div>
      {/if}
    </div>
    <button class="clear" on:click={clear}>×</button>
  </div>
{:else}
  <div class="wrap">
    <input class="form-input" value={query} on:input={e => search(e.currentTarget.value)} placeholder="Search RAWG database…" />
    {#if loading || results.length > 0}
      <div class="results">
        {#if loading}<div class="loading">searching…</div>{/if}
        {#each results as r}
          <div class="result" on:click={() => pick(r)} role="button" tabindex="0" on:keydown={e => e.key === 'Enter' && pick(r)}>
            {#if r.background_image}<img src={r.background_image} alt="" class="thumb" />{/if}
            <span class="name">{r.name}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .wrap { position: relative; margin-bottom: 4px; }
  .results {
    background: var(--s2);
    border: 1px solid var(--border2);
    border-top: none;
    max-height: 240px;
    overflow-y: auto;
    position: absolute;
    left: 0; right: 0;
    z-index: 50;
  }
  .result {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    transition: .15s;
    border-bottom: 1px solid var(--border);
  }
  .result:hover { background: var(--s3); }
  .result:last-child { border-bottom: none; }
  .thumb { width: 48px; height: 27px; object-fit: cover; flex-shrink: 0; background: var(--s3); }
  .name { font-size: 11px; color: var(--text); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .loading { padding: 12px; font-size: 11px; color: var(--t3); text-align: center; }

  .selected {
    background: var(--s2);
    border: 1px solid var(--border2);
    padding: 8px 10px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 4px;
  }
  .sel-img { width: 64px; height: 36px; object-fit: cover; flex-shrink: 0; margin-top: 2px; }
  .sel-info { flex: 1; min-width: 0; }
  .sel-name { font-size: 12px; color: var(--text); margin-bottom: 5px; }
  .clear { background: transparent; color: var(--t3); font-size: 16px; flex-shrink: 0; padding: 0 4px; border: none; cursor: pointer; }
  .clear:hover { color: var(--text); }

  .hltb-loading { font-size: 10px; color: var(--t3); }

  .ttb-row { display: flex; gap: 4px; flex-wrap: wrap; }
  .ttb-chip {
    font-family: var(--mono);
    font-size: 10px;
    padding: 3px 7px;
    background: var(--s3);
    border: 1px solid var(--border2);
    color: var(--t2);
    cursor: pointer;
    transition: .15s;
  }
  .ttb-chip:hover { color: var(--text); border-color: var(--accent); }
  .ttb-chip.active { background: var(--accent); color: #111; border-color: var(--accent); }

  .hltb-multi-label { font-size: 10px; color: var(--t2); margin-bottom: 4px; }
  .hltb-multi { display: flex; flex-direction: column; gap: 3px; }
  .hltb-game-btn {
    font-family: var(--mono);
    font-size: 10px;
    text-align: left;
    padding: 3px 7px;
    background: var(--s3);
    border: 1px solid var(--border);
    color: var(--t2);
    cursor: pointer;
    transition: .15s;
  }
  .hltb-game-btn:hover { color: var(--text); border-color: var(--border2); }

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
