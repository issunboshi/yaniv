<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { PLAYER_COLORS, PLAYER_AVATARS } from '$lib/constants';

  interface PlayerEntry {
    name: string;
    avatar: string;
    color: string;
  }

  interface Props {
    players: PlayerEntry[];
  }

  let { players = $bindable() }: Props = $props();

  function addPlayer() {
    if (players.length >= 6) return;
    const idx = players.length;
    players = [...players, {
      name: '',
      avatar: PLAYER_AVATARS[idx % PLAYER_AVATARS.length],
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    }];
  }

  function removePlayer(index: number) {
    if (players.length <= 2) return;
    players = players.filter((_, i) => i !== index);
  }
</script>

<div class="space-y-3">
  {#each players as player, i}
    <div class="flex items-center gap-2">
      <span class="text-2xl">{player.avatar}</span>
      <Input
        bind:value={player.name}
        placeholder="Player {i + 1}"
        class="flex-1 bg-emerald-900/40 border-emerald-700 text-emerald-100 placeholder:text-emerald-600"
      />
      {#if players.length > 2}
        <Button variant="ghost" size="sm" onclick={() => removePlayer(i)} class="text-red-400 hover:text-red-300">
          ✕
        </Button>
      {/if}
    </div>
  {/each}

  {#if players.length < 6}
    <Button variant="outline" onclick={addPlayer} class="w-full border-dashed border-emerald-700 text-emerald-400">
      + Add Player
    </Button>
  {/if}
</div>
