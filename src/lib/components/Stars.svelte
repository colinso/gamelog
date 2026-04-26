<script lang="ts">
  export let value: number | null = null;
  export let onChange: ((v: number | null) => void) | null = null;
  export let size = 11;

  let hover: number | null = null;
  $: active = hover ?? value;
</script>

<div class="stars">
  {#each [1,2,3,4,5] as i}
    {@const t = i * 2}
    {@const filled = (active ?? 0) >= t}
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      class:full={filled}
      style="cursor: {onChange ? 'pointer' : 'default'}; flex-shrink: 0"
      on:click={() => onChange && onChange(value === t ? null : t)}
      on:mouseenter={() => onChange && (hover = t)}
      on:mouseleave={() => onChange && (hover = null)}
    >
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={filled ? '#a3e635' : '#2c2c2c'}
        stroke={filled ? '#7ab82a' : '#3a3a3a'}
        stroke-width="1"
      />
    </svg>
  {/each}
</div>

<style>
  .stars { display: flex; gap: 1px; }
</style>
