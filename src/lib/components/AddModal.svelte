<script lang="ts">
  import { STATUS_GROUPS, PLATFORMS } from '../constants';
  import { nextId } from '../stores';
  import type { Game, Status } from '../types';
  import RAWGSearch from './RAWGSearch.svelte';
  import Stars from './Stars.svelte';

  export let onClose: () => void;
  export let onAdd: (game: Game) => void;

  let f = { title: '', platform: 'PC', status: 'notStarted' as Status, hrsIn: '', ttb: '', rating: null as number | null, coop: false, notes: '', coverUrl: null as string | null };

  function handleRAWGSelect(sel: { title: string; coverUrl: string | null; ttb: number }) {
    if (sel.title) f.title = sel.title;
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
    onAdd({ id: nextId(), ...f, hrsIn, ttb, hrsLeft: Math.max(0, ttb - hrsIn) });
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
        <label class="form-label">Cover Art</label>
        <RAWGSearch onSelect={handleRAWGSelect} />
        <div style="margin-top:6px">
          <button type="button" class="btn-sm" on:click={() => uploadInput.click()}>↑ upload image</button>
          <input bind:this={uploadInput} type="file" accept="image/*" style="display:none" on:change={handleUpload} />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Title</label>
        <input class="form-input" bind:value={f.title} placeholder="Confirm or type manually…" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Platform</label>
          <select class="form-input form-select" bind:value={f.platform}>
            {#each PLATFORMS as p}<option>{p}</option>{/each}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-input form-select" bind:value={f.status}>
            {#each STATUS_GROUPS as sg}<option value={sg.key}>{sg.label}</option>{/each}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Time to Beat (h)</label>
          <input class="form-input" type="number" step="0.5" min="0" bind:value={f.ttb} placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Hours Played</label>
          <input class="form-input" type="number" step="0.5" min="0" bind:value={f.hrsIn} placeholder="0" />
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
      <button type="submit" class="btn-primary">add to archive</button>
    </form>
  </div>
</div>


<style>
  @import '../modal.css';
</style>
