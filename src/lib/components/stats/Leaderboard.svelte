<script lang="ts">
  import type { PlayerStats } from '$lib/types';

  interface Props {
    stats: PlayerStats[];
    onSelectPlayer?: (player: PlayerStats) => void;
    selectedPlayerId?: string | null;
  }

  let { stats, onSelectPlayer, selectedPlayerId = null }: Props = $props();

  const ranked = $derived(
    stats
      .filter(s => s.gamesPlayed >= 2)
      .map(s => ({ ...s, winRate: s.gamesPlayed > 0 ? (s.wins / s.gamesPlayed) * 100 : 0 }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
  );
</script>

<div class="space-y-2">
  {#if ranked.length === 0}
    <p class="text-center text-sm text-emerald-500 py-8">
      No players with 2+ completed games yet.
    </p>
  {/if}

  {#each ranked as player, i}
    {@const isFirst = i === 0}
    {@const isSelected = selectedPlayerId === player.playerId}
    <button
      onclick={() => onSelectPlayer?.(player)}
      class="w-full rounded-lg border px-4 py-3 text-left transition-colors {isFirst
        ? 'border-amber-600/60 bg-amber-950/40 hover:bg-amber-950/60'
        : 'border-emerald-800/50 bg-emerald-950/50 hover:bg-emerald-900/50'} {isSelected
        ? 'ring-1 ring-amber-500' : ''}"
    >
      <div class="flex items-center gap-3">
        <!-- Rank -->
        <span class="w-6 text-center font-bold {isFirst ? 'text-amber-400' : 'text-emerald-500'} text-sm shrink-0">
          {i + 1}
        </span>

        <!-- Avatar -->
        <span class="text-xl">{player.avatar}</span>

        <!-- Name & games -->
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm {isFirst ? 'text-amber-300' : 'text-emerald-200'} truncate">
            {player.name}
          </p>
          <p class="text-xs text-emerald-500">{player.gamesPlayed} games · {player.wins} wins</p>
        </div>

        <!-- Win rate -->
        <div class="text-right shrink-0">
          <p class="font-bold text-sm {isFirst ? 'text-amber-400' : 'text-emerald-300'}">
            {player.winRate.toFixed(0)}%
          </p>
          <p class="text-xs text-emerald-600">win rate</p>
        </div>
      </div>
    </button>
  {/each}
</div>
