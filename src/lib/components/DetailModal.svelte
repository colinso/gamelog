<script lang="ts">
  import { onMount } from 'svelte';
  import { STATUS_MAP, PLATFORMS } from '../constants';
  import { fmt, pct, isSteamCover, isGenericSteamSyncCover } from '../utils';
  import type { Game, Status } from '../types';
  import CoverArt from './CoverArt.svelte';
  import Stars from './Stars.svelte';
  import RAWGSearch from './RAWGSearch.svelte';
  import SteamSearch from './SteamSearch.svelte';
  import { STATUS_GROUPS } from '../constants';

  export let game: Game;
  export let onClose: () => void;
  export let onUpdate: (game: Game) => void;
  export let onHide: (id: number) => void;
  export let onDelete: (id: number) => void;

  let editing = false;
  let f = { ...game };

  // Track whether the Steam image is active, and preserve the fallback (RAWG/upload)
  // so toggling off restores it cleanly.
  let useSteamImg = Boolean(f.steamAppId && isSteamCover(f.coverUrl));
  let fallbackCover: string | null = isSteamCover(f.coverUrl) ? null : (f.coverUrl ?? null);

  $: sc = STATUS_MAP[game.status];
  $: prog = pct(game.hrsIn, game.ttb);

  onMount(async () => {
    if (useSteamImg && f.steamAppId && isGenericSteamSyncCover(f.coverUrl)) {
      try {
        const res = await fetch(`/api/steam/appdetails?appid=${f.steamAppId}`);
        if (res.ok) {
          const detail = await res.json();
          if (detail.header_image) {
            f.coverUrl = detail.header_image;
            // Silently persist the fixed URL so it doesn't need to happen again
            onUpdate({ ...f, hrsLeft: Math.max(0, (f.ttb || 0) - (f.hrsIn || 0)) });
          }
        }
      } catch {
        // Non-fatal — broken URL fallback (gradient) already handles display
      }
    }
  });

  function save() {
    onUpdate({ ...f, hrsLeft: Math.max(0, (f.ttb || 0) - (f.hrsIn || 0)) });
    editing = false;
  }

  async function toggleSteamImg(checked: boolean) {
    useSteamImg = checked;
    if (checked && f.steamAppId) {
      // Fetch the canonical header_image URL from appdetails (handles Akamai CDN for newer games)
      try {
        const res = await fetch(`/api/steam/appdetails?appid=${f.steamAppId}`);
        if (res.ok) {
          const detail = await res.json();
          f.coverUrl = detail.header_image ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${f.steamAppId}/header.jpg`;
        } else {
          f.coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${f.steamAppId}/header.jpg`;
        }
      } catch {
        f.coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${f.steamAppId}/header.jpg`;
      }
    } else {
      f.coverUrl = fallbackCover;
    }
  }

  function handleRAWGSelect(sel: { title: string; coverUrl: string | null; ttb: number }) {
    if (sel.title) f.title = sel.title;
    if (sel.coverUrl) {
      fallbackCover = sel.coverUrl;
      if (!useSteamImg) f.coverUrl = sel.coverUrl;
    }
    if (sel.ttb) f.ttb = sel.ttb;
  }

  function handleSteamSelect(result: { steamAppId: number; title: string; coverUrl: string }) {
    f.steamAppId = result.steamAppId;
    useSteamImg = true;
    f.coverUrl = result.coverUrl;
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      fallbackCover = dataUrl;
      if (!useSteamImg) f.coverUrl = dataUrl;
    };
    img.src = URL.createObjectURL(file);
    (e.target as HTMLInputElement).value = '';
  }
</script>

<div class="modal-bg" on:click|self={onClose} role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <div>
        <div class="eyebrow" style="color: {sc?.color}">{sc?.label} · {game.platform}</div>
        <div class="modal-title">{game.title}</div>
      </div>
      <div class="mhdr-r">
        {#if !editing}
          <button class="btn-sm" on:click={() => editing = true}>edit</button>
        {/if}
        <button class="btn-close" on:click={onClose}>×</button>
      </div>
    </div>

    <div class="modal-body">
      <div class="detail-art">
        <CoverArt game={editing ? { ...game, coverUrl: f.coverUrl } : game} showTitle={true} />
      </div>

      {#if !editing}
        <div class="dstats">
          <div class="dstat"><div class="dstat-val">{fmt(game.ttb)}h</div><div class="dstat-label">To Beat</div></div>
          <div class="dstat"><div class="dstat-val">{fmt(game.hrsIn)}h</div><div class="dstat-label">Played</div></div>
          <div class="dstat"><div class="dstat-val">{fmt(game.hrsLeft)}h</div><div class="dstat-label">Left</div></div>
        </div>
        {#if game.ttb > 0}
          <div style="margin-bottom: 14px">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px">
              <span style="font-size:9px; color:var(--t2); letter-spacing:1px">PROGRESS</span>
              <span style="font-size:9px; font-weight:600; color:{sc?.color ?? '#555'}">{prog}%</span>
            </div>
            <div class="prog-bar"><div class="prog-fill" style="width:{prog}%; background:{sc?.color ?? '#555'}"></div></div>
          </div>
        {/if}
        {#if game.rating != null}<div style="margin-bottom:12px"><Stars value={game.rating} size={15} /></div>{/if}
        {#if game.coop}<div style="font-size:10px; color:var(--c-pn); margin-bottom:10px; letter-spacing:1px">CO-OP</div>{/if}
        {#if game.notes}
          <div class="notes">{game.notes}</div>
        {/if}
        <div class="btn-row">
          {#if game.steamAppId}
            <a class="btn-secondary" href="https://store.steampowered.com/app/{game.steamAppId}" target="_blank" rel="noopener noreferrer">steam page</a>
          {/if}
          <button class="btn-secondary" on:click={() => { onHide(game.id); onClose(); }}>hide from library</button>
          <button class="btn-danger" on:click={() => { onDelete(game.id); onClose(); }}>delete</button>
        </div>
      {:else}
        <div class="form-group">
          <label class="form-label">Cover Art</label>
          <RAWGSearch onSelect={handleRAWGSelect} />
          <div class="cover-actions">
            <button class="btn-sm" type="button" on:click={() => uploadInput.click()}>↑ upload image</button>
            <input bind:this={uploadInput} type="file" accept="image/*" style="display:none" on:change={handleUpload} />
          </div>
          {#if f.steamAppId}
            <div class="toggle-row" style="margin-top:8px">
              <span class="toggle-label">Use Steam image</span>
              <label class="toggle">
                <input type="checkbox" checked={useSteamImg} on:change={e => toggleSteamImg(e.currentTarget.checked)} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          {/if}
        </div>
        <div class="form-group">
          <label class="form-label">Steam App ID</label>
          <div class="steam-id-row">
            <input class="form-input" type="number" min="1" step="1" placeholder="e.g. 1091500" bind:value={f.steamAppId} />
          </div>
          <SteamSearch onSelect={handleSteamSelect} />
        </div>
        <div class="form-group"><label class="form-label">Title</label><input class="form-input" bind:value={f.title} /></div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Platform</label>
            <select class="form-input form-select" bind:value={f.platform}>{#each PLATFORMS as p}<option>{p}</option>{/each}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-input form-select" bind:value={f.status}>{#each STATUS_GROUPS as sg}<option value={sg.key}>{sg.label}</option>{/each}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">TTB (h)</label><input class="form-input" type="number" step="0.5" bind:value={f.ttb} /></div>
          <div class="form-group"><label class="form-label">Played (h)</label><input class="form-input" type="number" step="0.1" bind:value={f.hrsIn} /></div>
        </div>
        <div class="form-group"><label class="form-label">Rating</label><Stars value={f.rating} onChange={v => f.rating = v} size={15} /></div>
        <div class="toggle-row" style="margin-bottom:12px">
          <span class="toggle-label">Co-op</span>
          <label class="toggle"><input type="checkbox" bind:checked={f.coop} /><span class="toggle-slider"></span></label>
        </div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" rows="2" bind:value={f.notes} style="resize:vertical"></textarea></div>
        <div class="btn-row">
          <button class="btn-secondary" on:click={() => editing = false}>cancel</button>
          <button class="btn-primary" style="flex:1" on:click={save}>save</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @import '../modal.css';
  .detail-art { width: 100%; aspect-ratio: 16/9; margin-bottom: 16px; position: relative; overflow: hidden; }
  .dstats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }
  .dstat { background: var(--s2); padding: 10px; text-align: center; border-top: 2px solid var(--border2); }
  .dstat-val { font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 3px; }
  .dstat-label { font-size: 9px; color: var(--t2); letter-spacing: 1px; text-transform: uppercase; }
  .prog-bar { background: var(--s3); height: 3px; overflow: hidden; margin-bottom: 14px; }
  .prog-fill { height: 100%; }
  .notes { background: var(--s2); padding: 9px 11px; font-size: 11px; color: var(--t2); margin-bottom: 12px; line-height: 1.6; border-left: 2px solid var(--border2); }
  .cover-actions { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
  .steam-id-row { display: flex; gap: 6px; align-items: center; }
  .steam-id-row .form-input { flex: 1; }
</style>
