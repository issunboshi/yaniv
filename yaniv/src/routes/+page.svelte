<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { storage } from '$lib/stores/storage.svelte';

  const inProgressGame = $derived(
    storage.games.find(g => g.status === 'in_progress')
  );
</script>

<div class="mx-auto max-w-lg px-4 pt-12 text-center">
  <div class="mb-8">
    <h1 class="text-5xl font-extrabold tracking-tight text-amber-400 drop-shadow-lg">
      YANIV
    </h1>
    <p class="mt-2 text-emerald-300/70 text-sm tracking-widest uppercase">Score Tracker</p>
  </div>

  <div class="space-y-4">
    <a href="/game/new">
      <Button class="w-full bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-lg py-6 shadow-lg shadow-amber-500/20">
        New Game
      </Button>
    </a>

    {#if inProgressGame}
      <a href="/game/{inProgressGame.id}">
        <Button variant="outline" class="w-full border-emerald-600 text-emerald-300 hover:bg-emerald-900/50 py-4">
          Resume Game ({inProgressGame.players.length} players, round {inProgressGame.rounds.length})
        </Button>
      </a>
    {/if}
  </div>

  <div class="mt-12 grid grid-cols-2 gap-3">
    {#each [
      { href: '/rules', icon: '📜', label: 'Rules' },
      { href: '/cards', icon: '🃏', label: 'Card Values' },
      { href: '/history', icon: '📊', label: 'History' },
      { href: '/stats', icon: '🏆', label: 'Stats' },
    ] as link}
      <a href={link.href}>
        <Card.Root class="bg-emerald-900/40 border-emerald-800/50 p-4 text-center hover:bg-emerald-900/60 transition-colors">
          <span class="text-2xl">{link.icon}</span>
          <p class="mt-1 text-sm text-emerald-300">{link.label}</p>
        </Card.Root>
      </a>
    {/each}
  </div>
</div>
