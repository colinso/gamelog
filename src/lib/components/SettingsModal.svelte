<script lang="ts">
  import { theme, THEMES } from '../theme';
  import type { Game } from '../types';

  export let onClose: () => void;
  export let games: Game[];
  export let onImport: (games: Game[], merge: boolean) => void;
  export let onSteamSync: () => void;
  export let steamSyncing: boolean;
  export let onEpicSync: () => void;
  export let epicSyncing: boolean;
  export let onSwitchSync: () => void;
  export let switchSyncing: boolean;
  export let switchConfigured: boolean;
  export let showHidden: boolean;
  export let onToggleHidden: (show: boolean) => void;

  import { onMount } from 'svelte';

  let epicConnected = false;
  let epicAccountId = '';
  let epicDisplayName = '';
  let epicPaste = '';
  let epicConnecting = false;
  let epicError = '';

  onMount(async () => {
    const res = await fetch('/api/epic/auth');
    if (res.ok) {
      const data = await res.json();
      epicConnected = data.connected;
      epicAccountId = data.accountId ?? '';
      epicDisplayName = data.displayName ?? data.accountId ?? '';
    }
  });

  async function connectEpic() {
    epicConnecting = true;
    epicError = '';
    try {
      const parsed = JSON.parse(epicPaste.trim());
      const res = await fetch('/api/epic/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) { epicError = data?.message ?? 'Import failed'; return; }
      epicConnected = true;
      epicAccountId = data.accountId;
      epicDisplayName = data.displayName ?? data.accountId;
      epicPaste = '';
    } catch (e: any) {
      epicError = e.message?.includes('JSON') ? 'Invalid JSON — paste the full file contents' : (e.message ?? 'Failed');
    } finally {
      epicConnecting = false;
    }
  }

  async function disconnectEpic() {
    await fetch('/api/epic/auth', { method: 'DELETE' });
    epicConnected = false;
    epicAccountId = '';
  }

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

  async function exportLibrary() {
    const res = await fetch('/api/games?includeHidden=true');
    const allGames = res.ok ? await res.json() : games;
    const blob = new Blob(
      [JSON.stringify({ version: 1, exported: new Date().toISOString(), games: allGames }, null, 2)],
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
        <div class="setting-label">Epic Games</div>
        {#if epicConnected}
          <div class="sync-row">
            <button class="btn-secondary" on:click={onEpicSync} disabled={epicSyncing}>
              {epicSyncing ? 'syncing…' : '⟳ sync epic library'}
            </button>
            <button class="btn-sm" on:click={disconnectEpic}>disconnect</button>
          </div>
          <div class="epic-meta">connected as {epicDisplayName}</div>
        {:else}
          <p class="epic-instructions">
            Run these commands on any machine with Python, then paste the output below:
          </p>
          <pre class="epic-cmd">pip3 install legendary-gl
legendary auth
cat ~/.config/legendary/user.json</pre>
          <textarea
            class="form-input epic-paste"
            placeholder="Paste user.json contents here…"
            bind:value={epicPaste}
            rows="3"
          ></textarea>
          <button
            class="btn-secondary"
            style="margin-top:6px"
            on:click={connectEpic}
            disabled={epicConnecting || !epicPaste.trim()}
          >{epicConnecting ? 'importing…' : 'import credentials'}</button>
          {#if epicError}<p class="epic-error">{epicError}</p>{/if}
        {/if}
      </div>

      <div class="setting-section">
        <div class="setting-label">Nintendo Switch</div>
        {#if switchConfigured}
          <div class="sync-row">
            <button class="btn-secondary" on:click={onSwitchSync} disabled={switchSyncing}>
              {switchSyncing ? 'syncing…' : '⟳ sync switch library'}
            </button>
          </div>
        {:else}
          <p class="epic-instructions">
            Set <code>SWITCH_SESSION_TOKEN</code> and <code>SWITCH_DEVICE_ID</code> in your environment to enable Switch sync.
          </p>
        {/if}
      </div>

      <div class="setting-section">
        <div class="setting-label">Library</div>
        <div class="toggle-row" style="margin-bottom:12px">
          <span class="toggle-label">Show hidden games</span>
          <label class="toggle">
            <input type="checkbox" checked={showHidden} on:change={e => onToggleHidden(e.currentTarget.checked)} />
            <span class="toggle-slider"></span>
          </label>
        </div>
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
  .epic-meta { font-size: 9px; color: var(--t3); margin-top: 6px; }
  .epic-instructions { font-size: 10px; color: var(--t2); margin: 0 0 6px; line-height: 1.6; }
  .epic-cmd {
    font-family: var(--mono); font-size: 10px; color: var(--text);
    background: var(--s3); border: 1px solid var(--border);
    padding: 8px 10px; margin: 0 0 8px; white-space: pre; overflow-x: auto;
  }
  .epic-paste { resize: vertical; font-size: 10px; }
  .epic-error { font-size: 10px; color: var(--c-ab); margin: 6px 0 0; }

  .toggle-row { display: flex; align-items: center; justify-content: space-between; }
  .toggle-label { font-size: 11px; color: var(--text); font-family: var(--mono); }
  .toggle { position: relative; display: inline-block; width: 36px; height: 18px; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
    background-color: var(--s3); transition: .2s; border: 1px solid var(--border2);
  }
  .toggle-slider:before {
    position: absolute; content: ""; height: 10px; width: 10px; left: 3px; bottom: 3px;
    background-color: var(--text); transition: .2s;
  }
  input:checked + .toggle-slider { background-color: var(--accent); border-color: var(--accent); }
  input:checked + .toggle-slider:before { transform: translateX(18px); background-color: #111; }
</style>
