<script lang="ts">
  import type { PlayerStats } from '$lib/types';

  interface Props {
    player: PlayerStats;
  }

  let { player }: Props = $props();

  const winRate = $derived(
    player.gamesPlayed > 0 ? ((player.wins / player.gamesPlayed) * 100).toFixed(1) : '0.0'
  );
  const yanivSuccessRate = $derived(
    player.yanivCalls > 0
      ? ((player.successfulYanivs / player.yanivCalls) * 100).toFixed(1)
      : '—'
  );

  const statCards = $derived([
    { label: 'Games Played', value: String(player.gamesPlayed) },
    { label: 'Wins', value: String(player.wins) },
    { label: 'Win Rate', value: `${winRate}%` },
    { label: 'Avg Final Score', value: String(player.averageFinalScore) },
    { label: 'Yaniv Calls', value: String(player.yanivCalls) },
    { label: 'Successful Yanivs', value: String(player.successfulYanivs) },
    { label: 'Yaniv Success %', value: yanivSuccessRate === '—' ? '—' : `${yanivSuccessRate}%` },
    { label: 'Times Assaf\'d', value: String(player.timesAssafed) },
    { label: 'Assafs Performed', value: String(player.timesPerformedAssaf) },
    { label: 'Halving Events', value: String(player.halvingEvents) },
    { label: 'Best Comeback', value: player.bestComeback > 0 ? `-${player.bestComeback}` : '—' },
  ]);
</script>

<div class="rounded-xl border border-emerald-700/60 bg-emerald-950/60 p-4 space-y-3">
  <!-- Player header -->
  <div class="flex items-center gap-3 pb-2 border-b border-emerald-800/40">
    <span class="text-3xl">{player.avatar}</span>
    <div>
      <h3 class="font-bold text-amber-400 text-lg">{player.name}</h3>
      <p class="text-xs text-emerald-500">{player.gamesPlayed} games played</p>
    </div>
  </div>

  <!-- Stat grid -->
  <div class="grid grid-cols-2 gap-2">
    {#each statCards as card}
      <div class="rounded-lg bg-emerald-900/50 border border-emerald-800/40 px-3 py-2">
        <p class="text-xs text-emerald-500 leading-tight">{card.label}</p>
        <p class="text-base font-bold text-emerald-200 mt-0.5">{card.value}</p>
      </div>
    {/each}
  </div>
</div>
