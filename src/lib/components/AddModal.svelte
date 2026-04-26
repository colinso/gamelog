<script lang="ts">
  import { STATUS_GROUPS, PLATFORMS } from '../constants';
  import type { Game, Status } from '../types';
  import RAWGSearch from './RAWGSearch.svelte';
  import Stars from './Stars.svelte';

  export let onClose: () => void;
  export let onAdd: (game: Omit<Game, 'id'>) => void;

  let f = { title: '', platform: 'PC', status: 'wishlist' as Status, hrsIn: '', ttb: '', rating: null as number | null, coop: false, notes: '', coverUrl: null as string | null };
  let showTitleOverride = false;

  function handleRAWGSelect(sel: { title: string; coverUrl: string | null; ttb: number }) {
    f.title = sel.title;
    if (sel.coverUrl) f.coverUrl = sel.coverUrl;
    if (sel.ttb) f.ttb = String(sel.ttb);
  }

  let uploadInput: HTMLInputElement;
  function handleUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      const maxW = 640, maxH = 360;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      f.coverUrl = canvas.toDataURL('image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
    (e.target as HTMLInputElement).value = '';
  }

  function submit(e: Event) {
    e.preventDefault();
    if (!f.title.trim()) return;
    const hrsIn = parseFloat(f.hrsIn) || 0;
    const ttb = parseFloat(f.ttb) || 0;
    onAdd({ ...f, hrsIn, ttb, hrsLeft: Math.max(0, ttb - hrsIn) });
    onClose();
  }
</script>

<div class="modal-bg" on:click|self={onClose} role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <div>
        <div class="eyebrow">new entry</div>
        <div class="modal-title">Add Game</div>
      </div>
      <button class="btn-close" on:click={onClose}>×</button>
    </div>
    <form class="modal-body" on:submit={submit}>
      <div class="form-group">
        <label class="form-label">Search Game (title, cover, hours)</label>
        <RAWGSearch onSelect={handleRAWGSelect} />
        <div style="margin-top:6px">
          <button type="button" class="btn-sm" on:click={() => uploadInput.click()}>↑ upload custom image</button>
          <input bind:this={uploadInput} type="file" accept="image/*" style="display:none" on:change={handleUpload} />
        </div>
      </div>
      {#if f.title}
        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" bind:checked={showTitleOverride} style="margin-right:6px" />
            Override title
          </label>
          {#if showTitleOverride}
            <input class="form-input" bind:value={f.title} placeholder="Enter title…" />
          {/if}
        </div>
      {/if}
      <div class="form-group">
        <label class="form-label">Status</label>
        <div class="status-pills">
          {#each STATUS_GROUPS as sg}
            <button
              type="button"
              class="status-pill"
              class:active={f.status === sg.key}
              style={f.status === sg.key ? `background:${sg.color};border-color:${sg.color};color:#111` : `border-color:${sg.color}33`}
              on:click={() => f.status = sg.key}
            >{sg.label}</button>
          {/each}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Platform</label>
        <select class="form-input form-select" bind:value={f.platform}>
          {#each PLATFORMS as p}<option>{p}</option>{/each}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Time to Beat (h)</label>
          <input class="form-input" type="number" step="0.5" min="0" bind:value={f.ttb} placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Hours Played</label>
          <input class="form-input" type="number" step="0.1" min="0" bind:value={f.hrsIn} placeholder="0" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Rating</label>
        <Stars value={f.rating} onChange={v => f.rating = v} size={16} />
      </div>
      <div class="toggle-row">
        <span class="toggle-label">Co-op</span>
        <label class="toggle">
          <input type="checkbox" bind:checked={f.coop} />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <button type="submit" class="btn-primary">add game</button>
    </form>
  </div>
</div>


<style>
  @import '../modal.css';

  .status-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .status-pill {
    font-family: var(--mono);
    font-size: 10px;
    padding: 5px 10px;
    background: transparent;
    border: 1px solid var(--border2);
    color: var(--t2);
    cursor: pointer;
    transition: .15s;
    white-space: nowrap;
  }
  .status-pill:hover { color: var(--text); border-color: var(--border2); background: var(--s2); }
  .status-pill.active { color: #111; font-weight: 600; }
</style>
