<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import ShareButton from './ShareButton.svelte';
  import type { Game } from '$lib/types';
  import { getRunningTotals } from '$lib/engine/scoring';

  interface Props {
    game: Game;
  }

  let { game }: Props = $props();

  const totals = $derived(getRunningTotals(game.rounds));

  const rankedPlayers = $derived(() => {
    const sorted = [...game.players].sort((a, b) => {
      if (!a.eliminated && !b.eliminated) {
        return (totals[a.knownPlayerId] ?? 0) - (totals[b.knownPlayerId] ?? 0);
      }
      if (a.eliminated && !b.eliminated) return 1;
      if (!a.eliminated && b.eliminated) return -1;
      return (a.eliminatedAtRound ?? 0) - (b.eliminatedAtRound ?? 0);
    });
    return sorted;
  });

  const winner = $derived(rankedPlayers()[0]);

  const highlights = $derived(() => {
    const items: { icon: string; text: string }[] = [];
    for (const round of game.rounds) {
      if (round.wasAssafed && round.assafPlayerIds.length > 0) {
        const assafer = game.players.find(p => p.knownPlayerId === round.assafPlayerIds[0]);
        const caller = game.players.find(p => p.knownPlayerId === round.yanivCallerId);
        if (assafer && caller) {
          items.push({
            icon: '⚡',
            text: `Round ${round.number}: ${assafer.avatar} ${assafer.name} Assaf'd ${caller.avatar} ${caller.name}!`
          });
        }
      }
      for (const pid of round.halvingEvents) {
        const player = game.players.find(p => p.knownPlayerId === pid);
        if (player) {
          items.push({
            icon: '✂️',
            text: `Round ${round.number}: ${player.avatar} ${player.name}'s score was halved!`
          });
        }
      }
    }
    return items;
  });

  function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
</script>

<div class="mx-auto max-w-lg px-4 py-8 space-y-8">
  <!-- Winner celebration -->
  {#if winner}
    <div class="text-center space-y-3">
      <div class="text-7xl mb-2 animate-winner inline-block">{winner.avatar}</div>
      <h2 class="text-3xl font-extrabold text-amber-400 tracking-tight">
        {winner.name} Wins!
      </h2>
      <p class="text-emerald-400 text-sm">
        Final score: {totals[winner.knownPlayerId] ?? 0} / {game.settings.scoreLimit}
      </p>
    </div>
  {/if}

  <!-- Ranked standings -->
  <div class="space-y-2">
    <h3 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Final Standings</h3>
    <div class="space-y-2">
      {#each rankedPlayers() as player, i}
        {@const score = totals[player.knownPlayerId] ?? 0}
        {@const isFirst = i === 0}
        <div class="flex items-center gap-3 rounded-xl px-4 py-3 border {isFirst ? 'border-amber-500/50 bg-amber-950/30' : 'border-emerald-800/50 bg-emerald-950/40'}">
          <span class="text-sm font-bold w-8 text-center {isFirst ? 'text-amber-400' : 'text-emerald-500'}">
            {ordinal(i + 1)}
          </span>
          <span class="text-2xl">{player.avatar}</span>
          <span class="flex-1 font-semibold {isFirst ? 'text-amber-200' : 'text-emerald-200'} {player.eliminated ? 'line-through text-red-400/70' : ''}">
            {player.name}
          </span>
          <span class="text-sm tabular-nums {isFirst ? 'text-amber-400 font-bold' : 'text-emerald-400'}">
            {#if player.eliminated}
              <span class="text-red-400 text-xs">OUT (r{player.eliminatedAtRound})</span>
            {:else}
              {score}
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Notable moments -->
  {#if highlights().length > 0}
    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Notable Moments</h3>
      <div class="space-y-1.5">
        {#each highlights() as item}
          <div class="flex items-start gap-2 text-sm text-emerald-300 bg-emerald-900/30 rounded-lg px-3 py-2">
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex gap-3 pt-2">
    <ShareButton {game} />
    <a href="/game/new" class="flex-1">
      <Button class="w-full bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold">
        New Game
      </Button>
    </a>
  </div>
</div>
