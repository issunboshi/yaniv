<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button/index.js';
  import Header from '$lib/components/layout/Header.svelte';
  import PlayerForm from '$lib/components/game-setup/PlayerForm.svelte';
  import VariantSelect from '$lib/components/game-setup/VariantSelect.svelte';
  import { VARIANT_CLASSIC, PLAYER_COLORS, PLAYER_AVATARS } from '$lib/constants';
  import { gameStore } from '$lib/stores/game.svelte';
  import { playersStore } from '$lib/stores/players.svelte';
  import type { GameSettings, GamePlayer } from '$lib/types';

  let players = $state([
    { name: '', avatar: PLAYER_AVATARS[0], color: PLAYER_COLORS[0] },
    { name: '', avatar: PLAYER_AVATARS[1], color: PLAYER_COLORS[1] },
  ]);

  let settings = $state<GameSettings>({ ...VARIANT_CLASSIC });

  function startGame() {
    const validPlayers = players.filter(p => p.name.trim());
    if (validPlayers.length < 2) return;

    const gamePlayers: GamePlayer[] = validPlayers.map((p, i) => {
      const known = playersStore.getOrCreate(p.name.trim(), p.avatar, p.color);
      return {
        playerId: known.id,
        name: known.name,
        avatar: known.avatar,
        color: known.color,
        eliminated: false,
        displayOrder: i,
      };
    });

    const gameId = gameStore.startGame(gamePlayers, settings);
    goto(`/game/${gameId}`);
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

  <Button
    onclick={startGame}
    disabled={!canStart}
    class="w-full bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-lg py-6 shadow-lg shadow-amber-500/20 disabled:opacity-40"
  >
    Start Game
  </Button>
</div>
