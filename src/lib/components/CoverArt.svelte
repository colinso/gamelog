<script lang="ts">
  import type { Game } from '../types';
  import { gameColor, initials } from '../utils';

  export let game: Game;
  export let showTitle = false;

  $: [c1, c2] = gameColor(game.title);
</script>

{#if game.coverUrl}
  <div class="cover-wrap">
    <img src={game.coverUrl} alt={game.title} />
    <div class="overlay"></div>
    {#if showTitle}<div class="cover-title">{game.title}</div>{/if}
  </div>
{:else}
  <div class="cover-grad" style="background: linear-gradient(150deg, {c1}, {c2})">
    <span class="cover-initials">{initials(game.title)}</span>
    <div class="overlay"></div>
    {#if showTitle}<div class="cover-title">{game.title}</div>{/if}
  </div>
{/if}

<style>
  .cover-wrap, .cover-grad {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(17,17,17,0.85) 0%, transparent 65%);
  }
  .cover-grad {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cover-initials {
    font-size: 18px;
    font-weight: 300;
    color: rgba(255,255,255,0.18);
    letter-spacing: 3px;
    position: relative;
    z-index: 1;
  }
  .cover-title {
    position: absolute;
    bottom: 12px;
    left: 14px;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    z-index: 2;
    text-shadow: 0 2px 8px rgba(0,0,0,0.9);
    line-height: 1.2;
  }
</style>
