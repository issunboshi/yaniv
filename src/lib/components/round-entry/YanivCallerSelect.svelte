<script lang="ts">
  import type { GamePlayer } from '$lib/types';

  interface Props {
    players: GamePlayer[];
    selectedId: string | null;
    onSelect: (id: string) => void;
  }

  let { players, selectedId, onSelect }: Props = $props();

  const activePlayers = $derived(players.filter(p => !p.eliminated));
</script>

<div class="space-y-2">
  <p class="text-sm text-emerald-400 font-semibold uppercase tracking-wider">Who called Yaniv?</p>
  <div class="flex flex-wrap gap-2">
    {#each activePlayers as player}
      <button
        type="button"
        onclick={() => onSelect(player.playerId)}
        class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          {selectedId === player.playerId
            ? 'border-amber-400 bg-amber-400/20 text-amber-300'
            : 'border-emerald-700 bg-emerald-900/40 text-emerald-200 hover:border-emerald-500'}"
      >
        <span class="text-xl">{player.avatar}</span>
        <span class="text-sm font-medium">{player.name}</span>
      </button>
    {/each}
  </div>
</div>
