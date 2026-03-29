<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Button } from '$lib/components/ui/button/index.js';
  import Header from '$lib/components/layout/Header.svelte';
  import Scoreboard from '$lib/components/scoreboard/Scoreboard.svelte';
  import RoundEntryPanel from '$lib/components/round-entry/RoundEntryPanel.svelte';
  import GameCodeDisplay from '$lib/components/game/GameCodeDisplay.svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { audio } from '$lib/stores/audio.svelte';
  import TableTimer from '$lib/components/timer/TableTimer.svelte';
  import type { AddRoundRequest } from '$lib/types';

  let showRoundEntry = $state(false);
  let notFound = $state(false);
  let loading = $state(true);
  let showAbandonConfirm = $state(false);
  let editingRoundIndex = $state<number | null>(null);
  let pendingEditIndex = $state<number | null>(null);

  const game = $derived(gameStore.activeGame);

  onMount(async () => {
    const code = $page.params.code!;
    if (!gameStore.activeGame || gameStore.activeGame.code !== code) {
      try {
        const found = await gameStore.loadGame(code);
        if (!found) {
          notFound = true;
        }
      } catch {
        notFound = true;
      }
    }
    loading = false;
  });

  onDestroy(() => {
    gameStore.cleanup();
  });

  async function handleRoundSubmit(
    handValues: Record<string, number>,
    yanivCallerId: string,
    assafPlayerIds: string[]
  ) {
    showRoundEntry = false;
    try {
      const req: AddRoundRequest = {
        handValues,
        yanivCallerId,
        assafPlayerIds: assafPlayerIds.length > 0 ? assafPlayerIds : [],
      };
      await gameStore.addRound(req);

      // Play sound effects based on latest round
      const latestRound = gameStore.activeGame?.rounds.at(-1);
      if (latestRound) {
        if (gameStore.activeGame?.status === 'completed') {
          audio.play('win');
        } else if (latestRound.wasAssafed) {
          audio.play('assaf');
        } else if (latestRound.halvingEvents.length > 0) {
          audio.play('halving');
        } else if (latestRound.eliminations.length > 0) {
          audio.play('elimination');
        } else {
          audio.play('yaniv');
        }
      }

      // Auto-navigate to results if game completed
      if (gameStore.activeGame?.status === 'completed') {
        goto(`/game/${gameStore.activeGame!.code}/results`);
      }
    } catch (e) {
      console.error('Failed to add round:', e);
    }
  }

  function handleEditRoundRequest(roundIndex: number) {
    if (!game || game.status !== 'in_progress') return;
    pendingEditIndex = roundIndex;
  }

  function confirmEdit() {
    if (pendingEditIndex === null) return;
    editingRoundIndex = pendingEditIndex;
    pendingEditIndex = null;
    showRoundEntry = true;
  }

  async function handleEditSubmit(
    handValues: Record<string, number>,
    yanivCallerId: string,
    assafPlayerIds: string[]
  ) {
    if (editingRoundIndex === null || !game) return;
    showRoundEntry = false;
    const round = game.rounds[editingRoundIndex];
    try {
      await gameStore.editRound(round.roundNumber, handValues);
      editingRoundIndex = null;

      if (gameStore.activeGame?.status === 'completed') {
        goto(`/game/${gameStore.activeGame!.code}/results`);
      }
    } catch (e) {
      console.error('Failed to edit round:', e);
    }
  }

  async function handleAbandon() {
    showAbandonConfirm = false;
    try {
      await gameStore.abandonGame();
      goto('/');
    } catch (e) {
      console.error('Failed to abandon game:', e);
    }
  }

  const activePlayerCount = $derived(game?.players.filter(p => !p.eliminated).length ?? 0);
  const roundCount = $derived(game?.rounds.length ?? 0);
</script>

{#if notFound}
  <Header title="Game Not Found" showBack />
  <div class="mx-auto max-w-lg px-4 py-12 text-center">
    <p class="text-emerald-400 mb-4">This game could not be found.</p>
    <a href="/">
      <Button class="bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold">Go Home</Button>
    </a>
  </div>
{:else if game}
  <Header title="Round {roundCount + 1}" showBack />

  <div class="mx-auto max-w-lg px-4 py-4 space-y-4">
    <!-- Share game code -->
    <GameCodeDisplay code={game.code} />

    <!-- Game status bar -->
    <div class="flex items-center justify-between text-xs text-emerald-500">
      <span>{activePlayerCount} active · limit {game.settings.scoreLimit}</span>
      <span class="capitalize">{game.settings.variantName}</span>
    </div>

    <!-- Table timer (advisory, shown when enabled in settings) -->
    {#if game.settings.tableTimerEnabled}
      <TableTimer seconds={game.settings.tableTimerSeconds} />
    {/if}

    <!-- Scoreboard -->
    <div class="rounded-xl border border-emerald-800/50 bg-emerald-950/60 overflow-hidden">
      <Scoreboard {game} onEditRound={game.status === 'in_progress' && !gameStore.isSpectator ? handleEditRoundRequest : undefined} />
    </div>

    <!-- Controls -->
    {#if game.status === 'in_progress' && !gameStore.isSpectator}
      <div class="flex gap-3">
        <Button
          onclick={() => showRoundEntry = true}
          class="flex-1 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold py-5 text-base shadow-lg shadow-amber-500/20"
        >
          + Add Round
        </Button>

        <Button
          variant="outline"
          onclick={() => showAbandonConfirm = true}
          class="border-red-800/50 text-red-400/70 hover:bg-red-950/30 hover:text-red-400 px-4"
        >
          Abandon Game
        </Button>
      </div>
    {:else if game.status !== 'in_progress'}
      <div class="text-center">
        <a href="/game/{game.code}/results">
          <Button class="bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold px-8">
            View Results
          </Button>
        </a>
      </div>
    {/if}

    <!-- Spectator indicator -->
    {#if gameStore.isSpectator}
      <div class="text-center text-sm text-emerald-500/70">
        Watching game · {gameStore.spectators.length} spectator{gameStore.spectators.length !== 1 ? 's' : ''}
      </div>
    {/if}
  </div>

  <!-- Round entry panel -->
  {#if showRoundEntry}
    <RoundEntryPanel
      {game}
      editingRound={editingRoundIndex !== null ? game.rounds[editingRoundIndex] : undefined}
      onSubmit={editingRoundIndex !== null ? handleEditSubmit : handleRoundSubmit}
      onClose={() => { showRoundEntry = false; editingRoundIndex = null; }}
    />
  {/if}

  <!-- Edit round confirm dialog -->
  {#if pendingEditIndex !== null}
    <div
      class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-emerald-950 border border-amber-700/50 rounded-2xl p-6 max-w-sm w-full space-y-4">
        <h3 class="text-lg font-bold text-amber-400 text-center">Edit Round {(game.rounds[pendingEditIndex]?.roundNumber) ?? ''}?</h3>
        <p class="text-sm text-emerald-400 text-center">
          Changing hand values will recalculate all scores, halvings, and eliminations from this round onward.
        </p>
        <div class="flex gap-3">
          <Button
            variant="outline"
            onclick={() => pendingEditIndex = null}
            class="flex-1 border-emerald-700 text-emerald-400"
          >
            Cancel
          </Button>
          <Button
            onclick={confirmEdit}
            class="flex-1 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold"
          >
            Edit Round
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Abandon confirm dialog -->
  {#if showAbandonConfirm}
    <div
      class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-emerald-950 border border-emerald-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
        <h3 class="text-lg font-bold text-red-400 text-center">Abandon Game?</h3>
        <p class="text-sm text-emerald-400 text-center">This will end the game without a winner. This cannot be undone.</p>
        <div class="flex gap-3">
          <Button
            variant="outline"
            onclick={() => showAbandonConfirm = false}
            class="flex-1 border-emerald-700 text-emerald-400"
          >
            Keep Playing
          </Button>
          <Button
            onclick={handleAbandon}
            class="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold"
          >
            Abandon
          </Button>
        </div>
      </div>
    </div>
  {/if}
{:else if loading}
  <!-- Loading state -->
  <Header title="Loading..." showBack />
  <div class="mx-auto max-w-lg px-4 py-12 text-center">
    <p class="text-emerald-500">Loading game...</p>
  </div>
{/if}
