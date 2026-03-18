<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import Leaderboard from '$lib/components/stats/Leaderboard.svelte';
  import PlayerDetail from '$lib/components/stats/PlayerDetail.svelte';
  import { storage } from '$lib/stores/storage.svelte';
  import { derivePlayerStats, deriveGlobalStats } from '$lib/engine/stats';
  import type { PlayerStats } from '$lib/types';

  const playerStats = $derived(derivePlayerStats(storage.games));
  const globalStats = $derived(deriveGlobalStats(storage.games));

  let selectedPlayer = $state<PlayerStats | null>(null);

  function handleSelectPlayer(player: PlayerStats) {
    selectedPlayer = selectedPlayer?.knownPlayerId === player.knownPlayerId ? null : player;
  }
</script>

<Header title="Statistics" showBack />

<div class="mx-auto max-w-lg px-4 py-6 space-y-6">

  <!-- Global stats summary -->
  <section>
    <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Overview</h2>
    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-emerald-800/50 bg-emerald-950/50 px-4 py-3">
        <p class="text-xs text-emerald-500">Total Games</p>
        <p class="text-2xl font-bold text-amber-400">{globalStats.totalGames}</p>
      </div>
      <div class="rounded-lg border border-emerald-800/50 bg-emerald-950/50 px-4 py-3">
        <p class="text-xs text-emerald-500">Total Rounds</p>
        <p class="text-2xl font-bold text-amber-400">{globalStats.totalRounds}</p>
      </div>
      <div class="rounded-lg border border-emerald-800/50 bg-emerald-950/50 px-4 py-3">
        <p class="text-xs text-emerald-500">Most Wins</p>
        <p class="text-base font-bold text-emerald-200 truncate">
          {globalStats.mostCommonWinner ? `${globalStats.mostCommonWinner.name} (${globalStats.mostCommonWinner.wins})` : '—'}
        </p>
      </div>
      <div class="rounded-lg border border-emerald-800/50 bg-emerald-950/50 px-4 py-3">
        <p class="text-xs text-emerald-500">Longest Game</p>
        <p class="text-base font-bold text-emerald-200">
          {globalStats.longestGame > 0 ? `${globalStats.longestGame} rounds` : '—'}
        </p>
      </div>
    </div>
  </section>

  <!-- Leaderboard -->
  <section>
    <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
      Leaderboard <span class="text-emerald-600 normal-case font-normal">(2+ games)</span>
    </h2>
    <Leaderboard
      stats={playerStats}
      onSelectPlayer={handleSelectPlayer}
      selectedPlayerId={selectedPlayer?.knownPlayerId ?? null}
    />
  </section>

  <!-- Player detail panel -->
  {#if selectedPlayer}
    <section>
      <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Player Detail</h2>
      <PlayerDetail player={selectedPlayer} />
    </section>
  {/if}

  <!-- All players (below threshold) -->
  {#if playerStats.filter(s => s.gamesPlayed < 2).length > 0}
    <section>
      <h2 class="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Other Players</h2>
      <div class="space-y-1">
        {#each playerStats.filter(s => s.gamesPlayed < 2) as player}
          <div class="flex items-center gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2">
            <span class="text-base">{player.avatar}</span>
            <span class="text-sm text-emerald-400">{player.name}</span>
            <span class="ml-auto text-xs text-emerald-600">{player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}

</div>
