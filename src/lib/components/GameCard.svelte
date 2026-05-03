<script lang="ts">
  import type { Game, Status } from '../types';
  import { STATUS_MAP } from '../constants';
  import { fmt, pct } from '../utils';
  import CoverArt from './CoverArt.svelte';
  import Stars from './Stars.svelte';

  export let game: Game;
  export let onClick: () => void;
  export let onDragStart: ((game: Game) => void) | undefined = undefined;
  export let onDragEnd: (() => void) | undefined = undefined;
  export let onLongPress: ((game: Game) => void) | undefined = undefined;

  $: sc = STATUS_MAP[game.status];
  $: prog = pct(game.hrsIn, game.ttb);
  $: showBar = game.ttb > 0 && (game.hrsIn > 0 || game.status === 'inProgress' || game.status === 'onShelf');

  let isDragging = false;
  let longPressTimer: ReturnType<typeof setTimeout>;
  let longPressTriggered = false;

  function handleDragStart(e: DragEvent) {
    if (!onDragStart) return;
    isDragging = true;
    onDragStart(game);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', game.id.toString());
    }
  }

  function handleDragEnd() {
    isDragging = false;
    if (onDragEnd) onDragEnd();
  }

  function handleTouchStart(e: TouchEvent) {
    if (!onLongPress) return;
    longPressTriggered = false;
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      onLongPress(game);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer);
  }

  function handleTouchMove() {
    clearTimeout(longPressTimer);
  }

  function handleClick(e: MouseEvent) {
    // Don't trigger onClick if long press was triggered
    if (longPressTriggered) {
      e.preventDefault();
      e.stopPropagation();
      longPressTriggered = false;
      return;
    }
    onClick();
  }

  function handleContextMenu(e: MouseEvent) {
    if (!onLongPress) return;
    e.preventDefault(); // Prevent default context menu
    onLongPress(game);
  }
</script>

<div
  class="card"
  class:dragging={isDragging}
  draggable={onDragStart !== undefined}
  on:click={handleClick}
  on:contextmenu={handleContextMenu}
  on:dragstart={handleDragStart}
  on:dragend={handleDragEnd}
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
  on:touchmove={handleTouchMove}
  role="button"
  tabindex="0"
  on:keydown={e => e.key === 'Enter' && onClick()}
>
  <div class="art">
    <CoverArt {game} />
    {#if game.coop}<div class="coop">CO-OP</div>{/if}
  </div>
  <div class="info">
    <div class="title">{game.title}</div>
    <div class="bar-track" class:bar-visible={showBar}>
      <div class="bar-fill" style="width: {prog}%; background: {sc?.color ?? '#555'}"></div>
    </div>
    <div class="bottom">
      {#if showBar}
        <span class="pct" style="color: {sc?.color ?? '#555'}">{prog}%</span>
      {:else}
        <span class="ttb">{game.ttb > 0 ? `${fmt(game.ttb)}h` : ''}</span>
      {/if}
      {#if game.rating != null}
        <Stars value={game.rating} size={9} />
      {:else if !showBar && game.ttb === 0}
        <span></span>
      {:else if showBar}
        <span class="hrs">{game.ttb > 0 ? `${fmt(game.ttb)}h` : ''}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .card {
    background: var(--s1);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: .2s;
    overflow: hidden;
    position: relative;
  }
  .card:hover {
    border-color: var(--border2);
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0,0,0,0.5);
  }
  .card.dragging {
    opacity: 0.5;
    transform: scale(0.95);
  }
  .art {
    width: 100%;
    aspect-ratio: 16/9;
    position: relative;
    overflow: hidden;
  }
  .coop {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(96,165,250,0.9);
    color: #111;
    font-size: 7px;
    font-weight: 700;
    padding: 2px 5px;
    letter-spacing: .8px;
  }
  .info { padding: 10px 12px 13px; height: 78px; overflow: hidden; }
  .title {
    font-size: 11px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.35;
    height: calc(2 * 1.35em);
    margin-bottom: 7px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .bar-track { height: 2px; width: 100%; margin-bottom: 4px; opacity: 0; }
  .bar-track.bar-visible { background: var(--s3); opacity: 1; }
  .bar-fill { height: 100%; transition: .3s; }
  .bottom { display: flex; align-items: center; justify-content: space-between; }
  .pct { font-size: 9px; font-weight: 600; letter-spacing: .3px; }
  .hrs, .ttb { font-size: 9px; color: var(--text3); }
</style>
