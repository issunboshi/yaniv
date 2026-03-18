<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { audio } from '$lib/stores/audio.svelte';

  interface Props {
    seconds: number;
  }
  let { seconds }: Props = $props();

  let remaining = $state(seconds);
  let running = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;

  function start() {
    if (remaining <= 0) remaining = seconds;
    running = true;
    interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        stop();
        audio.play('elimination'); // reuse as alert sound
      }
    }, 1000);
  }

  function stop() {
    running = false;
    if (interval) clearInterval(interval);
    interval = null;
  }

  function reset() {
    stop();
    remaining = seconds;
  }

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  const progress = $derived(remaining / seconds);
  const circumference = 2 * Math.PI * 45; // r=45
  const dashOffset = $derived(circumference * (1 - progress));
  const isLow = $derived(remaining <= seconds * 0.25 && remaining > 0);
  const isExpired = $derived(remaining <= 0);
</script>

<div class="flex flex-col items-center gap-4 p-4 rounded-xl border border-emerald-800/50 bg-emerald-950/60">
  <p class="text-xs font-semibold uppercase tracking-widest text-emerald-400">Table Timer</p>

  <!-- Circular progress ring -->
  <div class="relative w-28 h-28">
    <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
      <!-- Track -->
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        stroke-width="6"
        class="text-emerald-900"
      />
      <!-- Progress arc -->
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        stroke-width="6"
        stroke-linecap="round"
        stroke-dasharray={circumference}
        stroke-dashoffset={dashOffset}
        class="transition-all duration-1000 ease-linear {isExpired ? 'text-red-500' : isLow ? 'text-amber-400' : 'text-emerald-400'}"
      />
    </svg>
    <!-- Center text -->
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-2xl font-bold tabular-nums {isExpired ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-300'}">
        {isExpired ? '0' : remaining}
      </span>
    </div>
  </div>

  <!-- Controls -->
  <div class="flex gap-2">
    {#if !running}
      <Button
        onclick={start}
        size="sm"
        class="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-4"
        disabled={isExpired && remaining <= 0}
      >
        {isExpired ? 'Expired' : 'Start'}
      </Button>
    {:else}
      <Button
        onclick={stop}
        size="sm"
        class="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4"
      >
        Pause
      </Button>
    {/if}
    <Button
      onclick={reset}
      size="sm"
      variant="outline"
      class="border-emerald-700 text-emerald-400 hover:bg-emerald-900/50 px-3"
    >
      Reset
    </Button>
  </div>
</div>
