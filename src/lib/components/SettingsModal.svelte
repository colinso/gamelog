<script lang="ts">
  import { theme, THEMES } from '../theme';
  import type { Game } from '../types';

  export let onClose: () => void;
  export let games: Game[];
  export let onImport: (games: Game[], merge: boolean) => void;
  export let onSteamSync: () => void;
  export let steamSyncing: boolean;

  $: lastSync = (() => {
    if (typeof localStorage === 'undefined') return null;
    const s = localStorage.getItem('steam_last_sync');
    if (!s) return null;
    return new Date(s).toLocaleString();
  })();

  let importInput: HTMLInputElement;

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      onClose();
    }
  }

  function exportLibrary() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, exported: new Date().toISOString(), games }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gamelog-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  function handleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target!.result as string);
        const imported: Game[] = data.games ?? data;
        if (!Array.isArray(imported)) throw new Error();
        const merge = window.confirm(
          `Import ${imported.length} games?\n\nOK = Merge with existing library\nCancel = Replace entire library`
        );
        onImport(imported, merge);
        onClose();
      } catch {
        alert("Could not parse file. Make sure it's a valid GameLog JSON export.");
      }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  }
</script>

<div
  class="modal-bg"
  on:click|self={onClose}
  on:keydown={handleBackdropKeydown}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="modal">
    <div class="modal-header">
      <div>
        <div class="eyebrow">preferences</div>
        <div class="modal-title">Settings</div>
      </div>
      <button class="btn-close" on:click={onClose}>×</button>
    </div>

    <div class="modal-body">
      <div class="setting-section">
        <div class="setting-label">Theme</div>
        <select class="form-input form-select" value={$theme} on:change={e => theme.set(e.currentTarget.value as any)}>
          {#each THEMES as t}
            <option value={t.value}>{t.label}</option>
          {/each}
        </select>
      </div>

      <div class="setting-section">
        <div class="setting-label">Steam</div>
        <div class="sync-row">
          <button class="btn-secondary" on:click={onSteamSync} disabled={steamSyncing}>
            {steamSyncing ? 'syncing…' : '⟳ sync steam library'}
          </button>
          {#if lastSync}<span class="sync-meta">last synced {lastSync}</span>{/if}
        </div>
      </div>

      <div class="setting-section">
        <div class="setting-label">Library</div>
        <div class="btn-row">
          <button class="btn-secondary" on:click={exportLibrary}>↓ export JSON</button>
          <button class="btn-secondary" on:click={() => importInput.click()}>↑ import JSON</button>
          <input bind:this={importInput} type="file" accept=".json" style="display:none" on:change={handleImport} />
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  @import '../modal.css';

  .modal { max-width: 360px; }

  .setting-section { margin-bottom: 20px; }
  .setting-section:last-child { margin-bottom: 0; }

  .setting-label {
    font-size: 9px;
    font-weight: 600;
    color: var(--t2);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }

  .btn-row { display: flex; gap: 8px; }
  .btn-secondary { flex: 1; }
  .sync-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .sync-meta { font-size: 9px; color: var(--t3); }
</style>
