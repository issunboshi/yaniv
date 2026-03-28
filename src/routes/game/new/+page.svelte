<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button/index.js';
  import Header from '$lib/components/layout/Header.svelte';
  import PlayerForm from '$lib/components/game-setup/PlayerForm.svelte';
  import VariantSelect from '$lib/components/game-setup/VariantSelect.svelte';
  import { VARIANT_CLASSIC, PLAYER_COLORS, PLAYER_AVATARS } from '$lib/constants';
  import { gameStore } from '$lib/stores/game.svelte';
  import type { GameSettings } from '$lib/types';

  let players = $state([
    { name: '', avatar: PLAYER_AVATARS[0], color: PLAYER_COLORS[0] },
    { name: '', avatar: PLAYER_AVATARS[1], color: PLAYER_COLORS[1] },
  ]);

  let settings = $state<GameSettings>({ ...VARIANT_CLASSIC });
  let creating = $state(false);
  let error = $state('');

  async function startGame() {
    const validPlayers = players.filter(p => p.name.trim());
    if (validPlayers.length < 2) return;

    creating = true;
    error = '';
    try {
      const game = await gameStore.createGame({
        players: validPlayers.map(p => ({
          name: p.name.trim(),
          avatar: p.avatar,
          color: p.color,
        })),
        settings,
        createdByName: validPlayers[0].name.trim(),
      });
      goto(`/game/${game.code}`);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create game';
      creating = false;
    }
  }

  const canStart = $derived(players.filter(p => p.name.trim()).length >= 2);
</script>

<Header title="New Game" showBack />

<div class="mx-auto max-w-lg px-4 py-6 space-y-8">
  <section>
    <h2 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Players</h2>
    <PlayerForm bind:players />
  </section>

  <section>
    <h2 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Variant</h2>
    <VariantSelect bind:settings />
  </section>

  {#if error}
    <p class="text-destructive text-sm text-center">{error}</p>
  {/if}

  <Button
    onclick={startGame}
    disabled={!canStart || creating}
    class="w-full bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-lg py-6 shadow-lg shadow-amber-500/20 disabled:opacity-40"
  >
    {creating ? 'Creating...' : 'Start Game'}
  </Button>
</div>
