<script lang="ts">
  export let label: string;
  export let color: string;
  export let count: number;
</script>

<div class="section-head">
  <div class="dot" style="background: {color}"></div>
  <div class="name" style="color: {color}">{label}</div>
  <div class="count">{count}</div>
  <div class="rule"></div>
</div>

<style>
  .section-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .name {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .count {
    font-size: 10px;
    color: var(--t3);
    margin-left: 2px;
  }
  .rule {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
</style>
