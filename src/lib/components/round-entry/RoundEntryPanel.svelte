<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import YanivCallerSelect from './YanivCallerSelect.svelte';
  import type { Game, Round } from '$lib/types';

  interface Props {
    game: Game;
    editingRound?: Round;
    onSubmit: (handValues: Record<string, number>, yanivCallerId: string, assafPlayerIds: string[]) => void;
    onClose: () => void;
  }

  let { game, editingRound, onSubmit, onClose }: Props = $props();

  const activePlayers = $derived(
    editingRound
      ? game.players.filter(p => p.knownPlayerId in editingRound.handValues)
      : game.players.filter(p => !p.eliminated)
  );

  let yanivCallerId = $state<string | null>(null);
  let handValueStrings = $state<Record<string, string>>({});
  let assafPlayerId = $state<string | null>(null);
  let noAssaf = $state(false);

  // Initialize hand value strings — pre-fill when editing
  $effect(() => {
    const initial: Record<string, string> = {};
    for (const p of activePlayers) {
      initial[p.knownPlayerId] = editingRound
        ? String(editingRound.handValues[p.knownPlayerId] ?? '')
        : '';
    }
    handValueStrings = initial;

    if (editingRound) {
      yanivCallerId = editingRound.yanivCallerId;
      assafPlayerId = editingRound.assafPlayerIds[0] ?? null;
      noAssaf = editingRound.wasAssafed ? false : editingRound.assafPlayerIds.length === 0;
    }
  });

  const potentialAssafers = $derived(() => {
    if (!yanivCallerId) return [];
    const callerHandStr = handValueStrings[yanivCallerId];
    const callerHand = parseInt(callerHandStr ?? '', 10);
    if (isNaN(callerHand)) return [];

    return activePlayers.filter(p => {
      if (p.knownPlayerId === yanivCallerId) return false;
      const handStr = handValueStrings[p.knownPlayerId];
      const hand = parseInt(handStr ?? '', 10);
      return !isNaN(hand) && hand <= callerHand;
    });
  });

  const showAssafPicker = $derived(
    game.settings.assafEnabled &&
    potentialAssafers().length > 0 &&
    !noAssaf &&
    assafPlayerId === null
  );

  const canSubmit = $derived(() => {
    if (!yanivCallerId) return false;
    for (const p of activePlayers) {
      const val = parseInt(handValueStrings[p.knownPlayerId] ?? '', 10);
      if (isNaN(val) || val < 0) return false;
    }
    // If assaf is enabled, require assaf resolution unless noAssaf
    if (game.settings.assafEnabled && potentialAssafers().length > 0 && !noAssaf && assafPlayerId === null) {
      return false;
    }
    return true;
  });

  function handleSubmit() {
    if (!yanivCallerId || !canSubmit()) return;

    const handValues: Record<string, number> = {};
    for (const p of activePlayers) {
      handValues[p.knownPlayerId] = parseInt(handValueStrings[p.knownPlayerId] ?? '0', 10);
    }

    onSubmit(handValues, yanivCallerId, assafPlayerId ? [assafPlayerId] : []);
    resetState();
  }

  function resetState() {
    yanivCallerId = null;
    handValueStrings = {};
    assafPlayerId = null;
    noAssaf = false;
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function selectYanivCaller(id: string) {
    yanivCallerId = id;
    // Reset assaf state when caller changes
    assafPlayerId = null;
    noAssaf = false;
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
  role="button"
  tabindex="-1"
  aria-label="Close panel"
  onclick={handleClose}
  onkeydown={(e) => e.key === 'Escape' && handleClose()}
></div>

<!-- Slide-up panel -->
<div class="fixed bottom-0 left-0 right-0 z-50 bg-emerald-950 border-t border-emerald-700 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
  <div class="mx-auto max-w-lg p-4 space-y-5">
    <!-- Handle bar -->
    <div class="flex justify-center">
      <div class="w-10 h-1 rounded-full bg-emerald-700"></div>
    </div>

    <h2 class="text-lg font-bold text-amber-400 text-center">
      {editingRound ? `Edit Round ${editingRound.number}` : 'Record Round'}
    </h2>

    <!-- Yaniv caller selection -->
    <YanivCallerSelect
      players={game.players}
      selectedId={yanivCallerId}
      onSelect={selectYanivCaller}
    />

    <!-- Hand value inputs -->
    {#if yanivCallerId}
      <div class="space-y-2">
        <p class="text-sm text-emerald-400 font-semibold uppercase tracking-wider">Hand Values</p>
        <div class="space-y-2">
          {#each activePlayers as player}
            <div class="flex items-center gap-3">
              <span class="text-xl w-8 text-center">{player.avatar}</span>
              <span class="flex-1 text-sm text-emerald-200 {player.knownPlayerId === yanivCallerId ? 'text-amber-300 font-semibold' : ''}">
                {player.name}
                {#if player.knownPlayerId === yanivCallerId}
                  <span class="ml-1 text-xs text-amber-500">(Yaniv)</span>
                {/if}
              </span>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={handValueStrings[player.knownPlayerId] ?? ''}
                oninput={(e) => {
                  handValueStrings[player.knownPlayerId] = (e.target as HTMLInputElement).value;
                  // Reset assaf state when values change
                  assafPlayerId = null;
                  noAssaf = false;
                }}
                class="w-20 text-right bg-emerald-900/60 border-emerald-700 text-emerald-100"
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Assaf picker -->
    {#if showAssafPicker}
      <div class="rounded-lg border border-red-500/50 bg-red-950/30 p-4 space-y-3">
        <p class="text-sm font-bold text-red-400 uppercase tracking-wider">Assaf! Who called it?</p>
        <div class="flex flex-wrap gap-2">
          {#each potentialAssafers() as player}
            <button
              type="button"
              onclick={() => assafPlayerId = player.knownPlayerId}
              class="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500 bg-red-950/50 text-red-300 hover:bg-red-900/50 transition-all"
            >
              <span class="text-xl">{player.avatar}</span>
              <span class="text-sm font-medium">{player.name}</span>
            </button>
          {/each}
          <button
            type="button"
            onclick={() => noAssaf = true}
            class="px-3 py-2 rounded-lg border border-emerald-700 bg-emerald-900/40 text-emerald-400 hover:border-emerald-500 text-sm transition-all"
          >
            No Assaf
          </button>
        </div>
      </div>
    {/if}

    <!-- Assaf confirmed indicator -->
    {#if assafPlayerId}
      {@const assafer = activePlayers.find(p => p.knownPlayerId === assafPlayerId)}
      {#if assafer}
        <div class="rounded-lg border border-amber-500/50 bg-amber-950/30 px-4 py-2 flex items-center gap-2">
          <span class="text-base">{assafer.avatar}</span>
          <span class="text-sm text-amber-300">{assafer.name} called Assaf!</span>
          <button
            type="button"
            onclick={() => { assafPlayerId = null; noAssaf = false; }}
            class="ml-auto text-emerald-500 hover:text-emerald-300 text-xs"
          >
            Change
          </button>
        </div>
      {/if}
    {/if}

    <!-- Submit button -->
    <div class="pb-4 flex gap-3">
      <Button
        variant="outline"
        onclick={handleClose}
        class="flex-1 border-emerald-700 text-emerald-400 hover:bg-emerald-900/50"
      >
        Cancel
      </Button>
      <Button
        onclick={handleSubmit}
        disabled={!canSubmit()}
        class="flex-1 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold disabled:opacity-40"
      >
        {editingRound ? 'Save Changes' : 'Confirm Round'}
      </Button>
    </div>
  </div>
</div>
