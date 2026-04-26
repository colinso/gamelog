<script lang="ts">
  import type { Game } from '../types';
  import { gameColor, initials, fmt, pct } from '../utils';

  export let game: Game;
  export let onClick: () => void;
  export let onLongPress: ((game: Game) => void) | undefined = undefined;
  export let onDragStart: ((game: Game) => void) | undefined = undefined;
  export let onDragEnd: (() => void) | undefined = undefined;

  let isDragging = false;

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

  $: [c1, c2] = gameColor(game.title);
  $: prog = pct(game.hrsIn, game.ttb);

  let longPressTimer: ReturnType<typeof setTimeout>;
  let longPressTriggered = false;

  function handleTouchStart(e: TouchEvent) {
    if (!onLongPress) return;
    longPressTriggered = false;
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      onLongPress(game);
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer);
  }

  function handleTouchMove() {
    clearTimeout(longPressTimer);
  }

  function handleClick(e: MouseEvent) {
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
    e.preventDefault();
    onLongPress(game);
  }
</script>

<div
  class="np-card"
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
    {#if game.coverUrl}
      <img src={game.coverUrl} alt={game.title} />
    {:else}
      <div class="grad" style="background: linear-gradient(150deg, {c1}, {c2})">
        <span class="initials">{initials(game.title)}</span>
      </div>
    {/if}
    <div class="overlay"></div>
    {#if game.coop}<div class="coop">CO-OP</div>{/if}
  </div>
  <div class="info">
    <div class="title">{game.title}</div>
    <div class="meta">
      <span class="platform">{game.platform}</span>
    </div>
    <div class="prog-wrap">
      <div class="bar-track"><div class="bar-fill" style="width: {prog}%"></div></div>
      <div class="bar-labels">
        <span class="bar-pct">{prog}%</span>
        <span>{fmt(game.hrsIn)}h / {fmt(game.ttb)}h</span>
      </div>
    </div>
  </div>
</div>

<style>
  .np-card.dragging {
    opacity: 0.5;
    transform: scale(0.95);
  }
  .np-card {
    background: var(--s1);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: .2s;
    display: flex;
    flex-direction: row;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    width: min(280px, 75vw);
  }
  .np-card:hover { border-color: var(--border2); background: var(--s2); }
  .art {
    width: 80px;
    min-height: 70px;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    align-self: stretch;
  }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .grad {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .initials { font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.18); letter-spacing: 2px; }
  .overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, rgba(17,17,17,0.3) 0%, transparent 100%);
  }
  .coop {
    position: absolute;
    top: 6px;
    right: 6px;
    background: rgba(96,165,250,0.9);
    color: #111;
    font-size: 7px;
    font-weight: 700;
    padding: 2px 5px;
    letter-spacing: .8px;
  }
  .info {
    padding: 10px 12px 12px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  .title {
    font-size: 11px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta { display: flex; gap: 8px; align-items: center; }
  .platform { font-size: 9px; color: var(--t3); letter-spacing: .5px; }
  .prog-wrap { margin-top: auto; }
  .bar-track { background: var(--s3); height: 2px; width: 100%; }
  .bar-fill { height: 100%; background: var(--c-ip); }
  .bar-labels { display: flex; justify-content: space-between; margin-top: 4px; font-size: 9px; color: var(--t2); }
  .bar-pct { color: var(--c-ip); font-weight: 600; }
</style>
