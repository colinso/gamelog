<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { theme } from '../lib/theme';

  onMount(() => {
    const saved = localStorage.getItem('theme') as typeof $theme | null;
    if (saved) theme.set(saved);
  });
</script>

<div class="theme-{$theme}">
  <slot />
</div>

<style>
  div {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
  }
</style>
