<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { api } from '$lib/stores/api';
  import { gameStore } from '$lib/stores/game.svelte';
  import type { Game } from '$lib/types';

  const code = $page.params.code!;
  let game = $state<Game | null>(null);
  let selectedPlayerId = $state<string | undefined>(undefined);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      game = await api.games.get(code);
    } catch {
      error = 'Game not found. Check the code and try again.';
    }
    loading = false;
  });

  async function handleJoin() {
    try {
      await gameStore.joinAsSpectator(code, selectedPlayerId);
      goto(`/game/${code}`);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to join game';
    }
  }
</script>

<Header title="Join Game" showBack backHref="/join" />

<div class="container mx-auto max-w-md p-4">
  {#if loading}
    <p class="text-center text-muted-foreground pt-8">Loading game...</p>
  {:else if error}
    <p class="text-center text-destructive pt-8">{error}</p>
  {:else if game}
    <div class="flex flex-col gap-6 pt-4">
      <div class="text-center">
        <p class="text-muted-foreground text-sm">Joining game</p>
        <p class="text-2xl font-bold tracking-widest">{game.code}</p>
      </div>

      <p class="text-muted-foreground text-sm">Which player are you?</p>

      <div class="flex flex-col gap-2">
        {#each game.players as player}
          <button
            class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {selectedPlayerId === player.playerId ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}"
            onclick={() => selectedPlayerId = player.playerId}
          >
            <span class="text-xl">{player.avatar}</span>
            <span class="font-medium">{player.name}</span>
            {#if selectedPlayerId === player.playerId}
              <span class="ml-auto text-xs text-primary">Selected</span>
            {/if}
          </button>
        {/each}

        <button
          class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {selectedPlayerId === undefined ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}"
          onclick={() => selectedPlayerId = undefined}
        >
          <span class="text-xl">👀</span>
          <span class="text-muted-foreground">Just watching</span>
        </button>
      </div>

      <Button onclick={handleJoin} size="lg" class="w-full">Join Game</Button>
    </div>
  {/if}
</div>
