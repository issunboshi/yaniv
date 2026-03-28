<script lang="ts">
  import { VARIANTS, VARIANT_CLASSIC } from '$lib/constants';
  import type { GameSettings } from '$lib/types';
  import { Input } from '$lib/components/ui/input/index.js';

  interface Props {
    settings: GameSettings;
  }

  let { settings = $bindable() }: Props = $props();
  let selectedVariant = $state<string>('Classic');

  function selectVariant(name: string) {
    selectedVariant = name;
    if (name !== 'Custom') {
      settings = { ...VARIANTS[name as keyof typeof VARIANTS] };
    }
  }
</script>

<div class="space-y-4">
  <div class="flex gap-2 flex-wrap">
    {#each [...Object.keys(VARIANTS), 'Custom'] as variant}
      <button
        onclick={() => selectVariant(variant)}
        class="rounded-lg px-4 py-2 text-sm font-medium transition-all
          {selectedVariant === variant
            ? 'bg-amber-500 text-emerald-950 shadow-lg shadow-amber-500/20'
            : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-700'}"
      >
        {variant}
      </button>
    {/each}
  </div>

  {#if selectedVariant === 'Custom'}
    <div class="grid grid-cols-2 gap-3 text-sm">
      <label class="space-y-1">
        <span class="text-emerald-400">Score Limit</span>
        <Input type="number" bind:value={settings.scoreLimit} class="bg-emerald-900/40 border-emerald-700" />
      </label>
      <label class="space-y-1">
        <span class="text-emerald-400">Yaniv Threshold</span>
        <Input type="number" bind:value={settings.yanivThreshold} class="bg-emerald-900/40 border-emerald-700" />
      </label>
      <label class="space-y-1">
        <span class="text-emerald-400">Assaf Penalty</span>
        <Input type="number" bind:value={settings.assafPenalty} class="bg-emerald-900/40 border-emerald-700" />
      </label>
      <label class="space-y-1">
        <span class="text-emerald-400">Table Timer (sec)</span>
        <Input type="number" bind:value={settings.tableTimerSeconds} class="bg-emerald-900/40 border-emerald-700" />
      </label>
    </div>
    <div class="flex flex-wrap gap-4 text-sm mt-3">
      <label class="flex items-center gap-2 text-emerald-300">
        <input type="checkbox" bind:checked={settings.halvingEnabled} class="accent-amber-500" />
        Halving at 50s
      </label>
      <label class="flex items-center gap-2 text-emerald-300">
        <input type="checkbox" bind:checked={settings.assafEnabled} class="accent-amber-500" />
        Assaf rule
      </label>
      {#if settings.assafEnabled}
        <label class="flex items-center gap-2 text-emerald-300">
          <input type="checkbox" bind:checked={settings.autoAssaf} class="accent-amber-500" />
          Auto-Reveal Assaf
        </label>
      {/if}
      <label class="flex items-center gap-2 text-emerald-300">
        <input type="checkbox" bind:checked={settings.jokersEnabled} class="accent-amber-500" />
        Jokers (0 pts)
      </label>
      <label class="flex items-center gap-2 text-emerald-300">
        <input type="checkbox" bind:checked={settings.tableTimerEnabled} class="accent-amber-500" />
        Table timer
      </label>
    </div>
  {/if}

  <div class="text-xs text-emerald-500 space-y-1">
    <p>Limit: {settings.scoreLimit} | Threshold: ≤{settings.yanivThreshold} | Assaf: +{settings.assafPenalty}</p>
  </div>
</div>
