<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { storage } from '$lib/stores/storage.svelte';
  import { getRunningTotals } from '$lib/engine/scoring';
  import { formatDateTime } from '$lib/utils';
  import type { Game } from '$lib/types';

  type StatusFilter = 'all' | 'completed' | 'in_progress' | 'abandoned';

  let statusFilter = $state<StatusFilter>('all');
  let playerFilter = $state('');
  let expandedId = $state<string | null>(null);
  let deleteConfirmId = $state<string | null>(null);
  let clearConfirm = $state(false);

  function computeDuration(game: Game): string {
    const end = game.completedAt ?? new Date().toISOString();
    const ms = new Date(end).getTime() - new Date(game.createdAt).getTime();
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function statusLabel(status: Game['status']): string {
    if (status === 'completed') return 'Completed';
    if (status === 'in_progress') return 'In Progress';
    return 'Abandoned';
  }

  function statusClass(status: Game['status']): string {
    if (status === 'completed') return 'bg-emerald-700/60 text-emerald-200';
    if (status === 'in_progress') return 'bg-amber-700/60 text-amber-200';
    return 'bg-red-900/60 text-red-300';
  }

  const filteredGames = $derived(() => {
    const lowerFilter = playerFilter.toLowerCase().trim();
    return storage.games
      .filter(g => statusFilter === 'all' || g.status === statusFilter)
      .filter(g => !lowerFilter || g.players.some(p => p.name.toLowerCase().includes(lowerFilter)))
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function confirmDelete(id: string) {
    deleteConfirmId = id;
  }

  function doDelete(id: string) {
    storage.deleteGame(id);
    deleteConfirmId = null;
    if (expandedId === id) expandedId = null;
  }

  function doClearAll() {
    storage.clearAllGames();
    clearConfirm = false;
  }
</script>

<Header title="Game History" showBack />

<div class="mx-auto max-w-lg px-4 py-6 space-y-4">

  <!-- Filters -->
  <div class="flex gap-2">
    <select
      bind:value={statusFilter}
      class="flex-1 rounded-md bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
    >
      <option value="all">All Games</option>
      <option value="completed">Completed</option>
      <option value="in_progress">In Progress</option>
      <option value="abandoned">Abandoned</option>
    </select>
    <input
      bind:value={playerFilter}
      placeholder="Filter by player…"
      class="flex-1 rounded-md bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 text-sm px-3 py-2 placeholder:text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
    />
  </div>

  <!-- Game count -->
  <p class="text-xs text-emerald-500 uppercase tracking-wider">
    {filteredGames().length} game{filteredGames().length !== 1 ? 's' : ''}
  </p>

  <!-- Game cards -->
  {#if filteredGames().length === 0}
    <div class="py-16 text-center text-emerald-500 text-sm">No games found.</div>
  {/if}

  {#each filteredGames() as game (game.id)}
    {@const totals = getRunningTotals(game.rounds)}
    {@const winner = game.winnerId ? game.players.find(p => p.playerId === game.winnerId) : null}
    {@const isExpanded = expandedId === game.id}
    {@const isConfirmingDelete = deleteConfirmId === game.id}

    <div class="rounded-xl border border-emerald-800/50 bg-emerald-950/60 overflow-hidden">
      <!-- Card header row -->
      <button
        onclick={() => toggleExpand(game.id)}
        class="w-full px-4 py-3 text-left hover:bg-emerald-900/40 transition-colors"
      >
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs text-emerald-500">{formatDateTime(game.createdAt)}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              {#each game.players as player}
                <span class="text-base" title={player.name}>{player.avatar}</span>
              {/each}
            </div>
            {#if winner}
              <p class="text-sm text-amber-400 font-semibold mt-1">Winner: {winner.name}</p>
            {/if}
          </div>
          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <span class="rounded-full px-2 py-0.5 text-xs font-medium {statusClass(game.status)}">
              {statusLabel(game.status)}
            </span>
            <span class="text-xs text-emerald-500">{game.rounds.length} rounds</span>
            <span class="text-xs text-emerald-500">{computeDuration(game)}</span>
          </div>
        </div>
      </button>

      <!-- Expanded detail -->
      {#if isExpanded}
        <div class="border-t border-emerald-800/40 px-4 py-3">
          <!-- Round-by-round table -->
          {#if game.rounds.length > 0}
            {@const roundRows = (() => {
              const running: Record<string, number> = {};
              return game.rounds.map(round => {
                const cells = game.players.map(player => {
                  const score = round.appliedScores[player.playerId] ?? 0;
                  running[player.playerId] = (running[player.playerId] ?? 0) + score;
                  return { score, cumulative: running[player.playerId] };
                });
                return { round, cells };
              });
            })()}
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-emerald-300">
                <thead>
                  <tr class="border-b border-emerald-800/40">
                    <th class="text-left py-1 pr-2 text-emerald-500 font-medium">Rnd</th>
                    {#each game.players as player}
                      <th class="text-right py-1 px-1 text-emerald-400 font-medium">
                        {player.avatar} {player.name.slice(0, 6)}
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each roundRows as row}
                    <tr class="border-b border-emerald-900/40">
                      <td class="py-1 pr-2 text-emerald-600">{row.round.roundNumber}</td>
                      {#each row.cells as cell}
                        <td class="text-right py-1 px-1">
                          <span class="text-emerald-400">{cell.score >= 0 ? '+' : ''}{cell.score}</span>
                          <span class="text-emerald-600 ml-0.5">={cell.cumulative}</span>
                        </td>
                      {/each}
                    </tr>
                  {/each}
                  <!-- Final totals -->
                  <tr class="border-t border-emerald-700/40 font-semibold">
                    <td class="py-1 pr-2 text-emerald-500">Total</td>
                    {#each game.players as player}
                      <td class="text-right py-1 px-1 text-amber-400">{totals[player.playerId] ?? 0}</td>
                    {/each}
                  </tr>
                </tbody>
              </table>
            </div>
          {:else}
            <p class="text-xs text-emerald-600 py-2">No rounds played.</p>
          {/if}

          <!-- Actions -->
          <div class="mt-3 flex justify-between items-center">
            {#if game.status === 'in_progress'}
              <a href="/game/{game.id}" class="text-xs rounded px-3 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-600/50 hover:bg-amber-500/30 transition-colors">
                Resume
              </a>
            {:else}
              <div></div>
            {/if}
            {#if isConfirmingDelete}
              <div class="flex items-center gap-2">
                <span class="text-xs text-red-400">Delete this game?</span>
                <button
                  onclick={() => doDelete(game.id)}
                  class="text-xs rounded px-2 py-1 bg-red-700/70 text-red-200 hover:bg-red-600/70"
                >Confirm</button>
                <button
                  onclick={() => (deleteConfirmId = null)}
                  class="text-xs rounded px-2 py-1 bg-emerald-800 text-emerald-300 hover:bg-emerald-700"
                >Cancel</button>
              </div>
            {:else}
              <button
                onclick={() => confirmDelete(game.id)}
                class="text-xs rounded px-3 py-1.5 bg-red-900/40 text-red-400 border border-red-800/50 hover:bg-red-900/60 transition-colors"
              >Delete</button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/each}

  <!-- Clear all -->
  {#if storage.games.length > 0}
    <div class="pt-4 border-t border-emerald-900/50">
      {#if clearConfirm}
        <div class="flex items-center justify-between rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3">
          <span class="text-sm text-red-300">Delete all {storage.games.length} games?</span>
          <div class="flex gap-2">
            <button
              onclick={doClearAll}
              class="text-sm rounded px-3 py-1.5 bg-red-700/70 text-red-200 hover:bg-red-600/70"
            >Yes, clear all</button>
            <button
              onclick={() => (clearConfirm = false)}
              class="text-sm rounded px-3 py-1.5 bg-emerald-800 text-emerald-300 hover:bg-emerald-700"
            >Cancel</button>
          </div>
        </div>
      {:else}
        <button
          onclick={() => (clearConfirm = true)}
          class="w-full rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400 hover:bg-red-950/50 transition-colors"
        >Clear All History</button>
      {/if}
    </div>
  {/if}
</div>
