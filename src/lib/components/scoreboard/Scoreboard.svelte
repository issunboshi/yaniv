<script lang="ts">
  import { getRunningTotals } from '$lib/engine/scoring';
  import type { Game } from '$lib/types';

  interface Props {
    game: Game;
    onEditRound?: (roundIndex: number) => void;
  }

  let { game, onEditRound }: Props = $props();

  const runningTotals = $derived(getRunningTotals(game.rounds));

  const leaderId = $derived(() => {
    const activePlayers = game.players.filter(p => !p.eliminated);
    if (activePlayers.length === 0) return null;
    let leader = activePlayers[0];
    for (const p of activePlayers) {
      const pScore = runningTotals[p.knownPlayerId] ?? 0;
      const leaderScore = runningTotals[leader.knownPlayerId] ?? 0;
      if (pScore < leaderScore) leader = p;
    }
    return leader.knownPlayerId;
  });

  function getRoundTotal(roundIndex: number, playerId: string): number {
    const rounds = game.rounds.slice(0, roundIndex + 1);
    return getRunningTotals(rounds)[playerId] ?? 0;
  }

  function getRoundDisplay(roundIndex: number, playerId: string): { text: string; classes: string } {
    const round = game.rounds[roundIndex];
    const appliedScore = round.appliedScores[playerId];
    const isYanivCaller = round.yanivCallerId === playerId;
    const isAssafer = round.assafPlayerIds.includes(playerId);
    const isEliminated = round.eliminations.includes(playerId);
    const isHalved = round.halvingEvents.includes(playerId);

    let text = '';
    let classes = 'text-right tabular-nums text-sm';

    if (isYanivCaller && !round.wasAssafed) {
      text = 'Y';
      classes += ' text-emerald-400 font-bold';
    } else if (isAssafer) {
      text = 'A';
      classes += ' text-amber-400 font-bold';
    } else if (appliedScore !== undefined) {
      text = appliedScore >= 0 ? `+${appliedScore}` : `${appliedScore}`;
      if (isEliminated) {
        classes += ' text-red-400 font-bold';
      } else if (isHalved) {
        classes += ' text-purple-400';
      } else {
        classes += ' text-emerald-200';
      }
    } else {
      text = '-';
      classes += ' text-emerald-700';
    }

    if (isHalved && !isYanivCaller && !isAssafer) {
      text += ' ½';
    }

    return { text, classes };
  }
</script>

<div class="overflow-x-auto">
  <table class="w-full text-sm border-collapse">
    <!-- Header -->
    <thead>
      <tr class="border-b border-emerald-800">
        <th class="text-left py-2 px-2 text-emerald-500 font-normal w-8">#</th>
        {#each game.players as player}
          <th class="py-2 px-2 text-center">
            <div class="flex flex-col items-center gap-1">
              <span class="text-xl">{player.avatar}</span>
              <span class="text-xs font-semibold truncate max-w-16 {player.eliminated ? 'line-through text-red-400/70' : 'text-emerald-200'}">
                {player.name}
              </span>
            </div>
          </th>
        {/each}
      </tr>
    </thead>

    <!-- Body: round rows -->
    <tbody>
      {#each game.rounds as round, i}
        <tr
          class="border-b border-emerald-900/50 hover:bg-emerald-900/20 {onEditRound ? 'cursor-pointer active:bg-emerald-900/40' : ''}"
          onclick={() => onEditRound?.(i)}
        >
          <td class="py-1.5 px-2 text-emerald-600 text-xs">{round.number}</td>
          {#each game.players as player}
            {@const display = getRoundDisplay(i, player.knownPlayerId)}
            {@const cumulative = getRoundTotal(i, player.knownPlayerId)}
            <td class="py-1.5 px-2 text-center">
              <div class="flex flex-col items-center leading-tight">
                <span class={display.classes}>{display.text}</span>
                <span class="text-[10px] tabular-nums text-emerald-600">{cumulative}</span>
              </div>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>

    <!-- Footer: running totals -->
    <tfoot>
      <tr class="border-t-2 border-emerald-700">
        <td class="py-2 px-2 text-emerald-500 text-xs font-bold">TOT</td>
        {#each game.players as player}
          {@const total = runningTotals[player.knownPlayerId] ?? 0}
          {@const isLeader = leaderId() === player.knownPlayerId}
          <td class="py-2 px-2 text-center">
            <span class="font-bold tabular-nums text-base {player.eliminated ? 'line-through text-red-400/60' : isLeader ? 'text-amber-400' : 'text-emerald-100'}">
              {total}
            </span>
          </td>
        {/each}
      </tr>
    </tfoot>
  </table>
</div>
