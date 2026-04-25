<script lang="ts">
  import type { Game } from '../types';
  import { STATUS_MAP } from '../constants';
  import { fmt, pct } from '../utils';
  import CoverArt from './CoverArt.svelte';
  import Stars from './Stars.svelte';

  export let game: Game;
  export let onClick: () => void;

  $: sc = STATUS_MAP[game.status];
  $: prog = pct(game.hrsIn, game.ttb);
  $: showBar = game.hrsIn > 0 || game.status === 'inProgress' || game.status === 'onShelf';
</script>

<div class="card" on:click={onClick} role="button" tabindex="0" on:keydown={e => e.key === 'Enter' && onClick()}>
  <div class="art">
    <CoverArt {game} />
    {#if game.coop}<div class="coop">CO-OP</div>{/if}
  </div>
  <div class="info">
    <div class="title">{game.title}</div>
    {#if showBar}
      <div class="bar-track"><div class="bar-fill" style="width: {prog}%; background: {sc?.color ?? '#555'}"></div></div>
      <div class="bottom">
        <span class="pct" style="color: {sc?.color ?? '#555'}">{prog}%</span>
        {#if game.rating != null}
          <Stars value={game.rating} size={9} />
        {:else}
          <span class="hrs">{game.ttb > 0 ? `${fmt(game.ttb)}h` : ''}</span>
        {/if}
      </div>
    {:else}
      <div class="bottom">
        <span class="ttb">{game.ttb > 0 ? `${fmt(game.ttb)}h` : ''}</span>
        {#if game.rating != null}<Stars value={game.rating} size={9} />{/if}
      </div>
    {/if}
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
  .info { padding: 10px 12px 13px; }
  .title {
    font-size: 11px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.35;
    margin-bottom: 7px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .bar-track { background: var(--s3); height: 2px; width: 100%; margin-bottom: 4px; }
  .bar-fill { height: 100%; transition: .3s; }
  .bottom { display: flex; align-items: center; justify-content: space-between; }
  .pct { font-size: 9px; font-weight: 600; letter-spacing: .3px; }
  .hrs, .ttb { font-size: 9px; color: var(--t3); }
</style>
