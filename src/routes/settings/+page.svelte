<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import { Input } from '$lib/components/ui/input/index.js';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { VARIANTS, VARIANT_CLASSIC } from '$lib/constants';
  import type { GameSettings } from '$lib/types';

  // Local reactive copy of defaults
  let defaults = $state<GameSettings>({ ...settingsStore.current.defaultGameSettings });
  let selectedVariant = $state<string>(settingsStore.current.defaultGameSettings.variantName ?? 'Classic');

  function selectVariant(name: string) {
    selectedVariant = name;
    if (name !== 'Custom') {
      defaults = { ...VARIANTS[name as keyof typeof VARIANTS] };
      settingsStore.updateDefaults(defaults);
    }
  }

  function updateCustomField<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    defaults = { ...defaults, [key]: value, variantName: 'Custom' };
    settingsStore.updateDefaults(defaults);
  }

  function handleSoundToggle(enabled: boolean) {
    settingsStore.setSound(enabled);
  }

  function handleVolumeChange(volume: number) {
    settingsStore.setSound(settingsStore.current.soundEnabled, volume);
  }

  function handleTheme(theme: 'dark' | 'light') {
    settingsStore.setTheme(theme);
  }

  function resetDefaults() {
    defaults = { ...VARIANT_CLASSIC };
    selectedVariant = 'Classic';
    settingsStore.updateDefaults(defaults);
  }
</script>

<Header title="Settings" showBack />

<div class="mx-auto max-w-lg px-4 py-6 space-y-8">

  <!-- Default Game Settings -->
  <section>
    <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Default Game Settings</h2>
    <div class="rounded-xl border border-emerald-800/50 bg-emerald-950/50 p-4 space-y-4">
      <!-- Variant buttons -->
      <div class="flex flex-wrap gap-2">
        {#each [...Object.keys(VARIANTS), 'Custom'] as variant}
          <button
            onclick={() => selectVariant(variant)}
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all {selectedVariant === variant
              ? 'bg-amber-500 text-emerald-950 shadow-lg shadow-amber-500/20'
              : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-700'}"
          >
            {variant}
          </button>
        {/each}
      </div>

      <!-- Custom fields -->
      {#if selectedVariant === 'Custom'}
        <div class="grid grid-cols-2 gap-3 text-sm">
          <label class="space-y-1">
            <span class="text-emerald-400 text-xs">Score Limit</span>
            <Input
              type="number"
              value={defaults.scoreLimit}
              oninput={(e) => updateCustomField('scoreLimit', Number((e.target as HTMLInputElement).value))}
              class="bg-emerald-900/40 border-emerald-700 text-emerald-200"
            />
          </label>
          <label class="space-y-1">
            <span class="text-emerald-400 text-xs">Yaniv Threshold</span>
            <Input
              type="number"
              value={defaults.yanivThreshold}
              oninput={(e) => updateCustomField('yanivThreshold', Number((e.target as HTMLInputElement).value))}
              class="bg-emerald-900/40 border-emerald-700 text-emerald-200"
            />
          </label>
          <label class="space-y-1">
            <span class="text-emerald-400 text-xs">Assaf Penalty</span>
            <Input
              type="number"
              value={defaults.assafPenalty}
              oninput={(e) => updateCustomField('assafPenalty', Number((e.target as HTMLInputElement).value))}
              class="bg-emerald-900/40 border-emerald-700 text-emerald-200"
            />
          </label>
          <label class="space-y-1">
            <span class="text-emerald-400 text-xs">Halving Multiple</span>
            <Input
              type="number"
              value={defaults.halvingMultiple}
              oninput={(e) => updateCustomField('halvingMultiple', Number((e.target as HTMLInputElement).value))}
              class="bg-emerald-900/40 border-emerald-700 text-emerald-200"
            />
          </label>
        </div>
        <div class="flex flex-wrap gap-4 text-sm">
          <label class="flex items-center gap-2 text-emerald-300">
            <input
              type="checkbox"
              checked={defaults.halvingEnabled}
              onchange={(e) => updateCustomField('halvingEnabled', (e.target as HTMLInputElement).checked)}
              class="accent-amber-500"
            />
            Halving
          </label>
          <label class="flex items-center gap-2 text-emerald-300">
            <input
              type="checkbox"
              checked={defaults.assafEnabled}
              onchange={(e) => updateCustomField('assafEnabled', (e.target as HTMLInputElement).checked)}
              class="accent-amber-500"
            />
            Assaf rule
          </label>
          <label class="flex items-center gap-2 text-emerald-300">
            <input
              type="checkbox"
              checked={defaults.jokersEnabled}
              onchange={(e) => updateCustomField('jokersEnabled', (e.target as HTMLInputElement).checked)}
              class="accent-amber-500"
            />
            Jokers
          </label>
        </div>
      {/if}

      <p class="text-xs text-emerald-600">
        Limit: {defaults.scoreLimit} · Threshold: ≤{defaults.yanivThreshold} · Assaf: +{defaults.assafPenalty}
      </p>
    </div>
  </section>

  <!-- Sound -->
  <section>
    <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Sound</h2>
    <div class="rounded-xl border border-emerald-800/50 bg-emerald-950/50 p-4 space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-sm text-emerald-200">Sound Effects</span>
        <div class="flex gap-2">
          <button
            onclick={() => handleSoundToggle(true)}
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all {settingsStore.current.soundEnabled
              ? 'bg-amber-500 text-emerald-950'
              : 'bg-emerald-900/40 text-emerald-400 border border-emerald-700 hover:bg-emerald-900/60'}"
          >On</button>
          <button
            onclick={() => handleSoundToggle(false)}
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all {!settingsStore.current.soundEnabled
              ? 'bg-amber-500 text-emerald-950'
              : 'bg-emerald-900/40 text-emerald-400 border border-emerald-700 hover:bg-emerald-900/60'}"
          >Off</button>
        </div>
      </div>

      {#if settingsStore.current.soundEnabled}
        <div class="space-y-1">
          <div class="flex justify-between text-xs text-emerald-500">
            <span>Volume</span>
            <span>{Math.round(settingsStore.current.soundVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settingsStore.current.soundVolume}
            oninput={(e) => handleVolumeChange(Number((e.target as HTMLInputElement).value))}
            class="w-full accent-amber-500"
          />
        </div>
      {/if}
    </div>
  </section>

  <!-- Theme -->
  <section>
    <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Theme</h2>
    <div class="rounded-xl border border-emerald-800/50 bg-emerald-950/50 p-4">
      <div class="flex gap-2">
        <button
          onclick={() => handleTheme('dark')}
          class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all {settingsStore.current.theme === 'dark'
            ? 'bg-amber-500 text-emerald-950 shadow-lg shadow-amber-500/20'
            : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/60'}"
        >
          Dark
        </button>
        <button
          onclick={() => handleTheme('light')}
          class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all {settingsStore.current.theme === 'light'
            ? 'bg-amber-500 text-emerald-950 shadow-lg shadow-amber-500/20'
            : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/60'}"
        >
          Light
        </button>
      </div>
    </div>
  </section>

  <!-- Reset defaults -->
  <section>
    <h2 class="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-3">Reset</h2>
    <div class="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-emerald-300">Reset Game Defaults</p>
          <p class="text-xs text-emerald-600 mt-0.5">Resets default game settings to Classic variant.</p>
        </div>
        <button
          onclick={resetDefaults}
          class="rounded-lg px-3 py-2 text-sm font-medium bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/80 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  </section>

</div>
