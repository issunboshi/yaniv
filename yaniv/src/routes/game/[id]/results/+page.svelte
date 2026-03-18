<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Button } from '$lib/components/ui/button/index.js';
  import Header from '$lib/components/layout/Header.svelte';
  import ResultsScreen from '$lib/components/game-over/ResultsScreen.svelte';
  import { gameStore } from '$lib/stores/game.svelte';

  let notFound = $state(false);

  const game = $derived(gameStore.active);

  onMount(() => {
    const id = $page.params.id;
    if (!gameStore.active || gameStore.active.id !== id) {
      const found = gameStore.loadGame(id);
      if (!found) {
        notFound = true;
      }
    }
  });
</script>

{#if notFound}
  <Header title="Results Not Found" showBack />
  <div class="mx-auto max-w-lg px-4 py-12 text-center">
    <p class="text-emerald-400 mb-4">This game could not be found.</p>
    <a href="/">
      <Button class="bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold">Go Home</Button>
    </a>
  </div>
{:else if game}
  <Header title="Game Over" showBack />
  <ResultsScreen {game} />
{:else}
  <Header title="Loading..." showBack />
  <div class="mx-auto max-w-lg px-4 py-12 text-center">
    <p class="text-emerald-500">Loading results...</p>
  </div>
{/if}
