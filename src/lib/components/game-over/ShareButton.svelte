<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import type { Game } from '$lib/types';
  import { getRunningTotals } from '$lib/engine/scoring';

  interface Props {
    game: Game;
  }

  let { game }: Props = $props();

  function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function buildShareText(): string {
    const totals = getRunningTotals(game.rounds);
    const limit = game.settings.scoreLimit;

    // Sort: non-eliminated by score (ascending), then eliminated by round
    const sorted = [...game.players].sort((a, b) => {
      if (!a.eliminated && !b.eliminated) {
        return (totals[a.knownPlayerId] ?? 0) - (totals[b.knownPlayerId] ?? 0);
      }
      if (a.eliminated && !b.eliminated) return 1;
      if (!a.eliminated && b.eliminated) return -1;
      return (a.eliminatedAtRound ?? 0) - (b.eliminatedAtRound ?? 0);
    });

    const lines: string[] = ['🃏 Yaniv Results 🃏', ''];

    sorted.forEach((player, i) => {
      const pos = ordinal(i + 1);
      const score = player.eliminated
        ? `OUT (round ${player.eliminatedAtRound})`
        : `${totals[player.knownPlayerId] ?? 0}/${limit}`;
      lines.push(`${pos} ${player.avatar} ${player.name} — ${score}`);
    });

    // Highlights
    const highlights: string[] = [];
    for (const round of game.rounds) {
      if (round.wasAssafed && round.assafPlayerId) {
        const assafer = game.players.find(p => p.knownPlayerId === round.assafPlayerId);
        const caller = game.players.find(p => p.knownPlayerId === round.yanivCallerId);
        if (assafer && caller) {
          highlights.push(`⚡ Round ${round.number}: ${assafer.avatar} ${assafer.name} Assaf'd ${caller.avatar} ${caller.name}!`);
        }
      }
      for (const pid of round.halvingEvents) {
        const player = game.players.find(p => p.knownPlayerId === pid);
        if (player) {
          highlights.push(`✂️ Round ${round.number}: ${player.avatar} ${player.name} score halved!`);
        }
      }
    }

    if (highlights.length > 0) {
      lines.push('', '✨ Highlights:');
      lines.push(...highlights);
    }

    lines.push('', 'Played with Yaniv Score Tracker');
    return lines.join('\n');
  }

  let copied = $state(false);

  async function share() {
    const text = buildShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Yaniv Results', text });
      } catch {
        // User cancelled or error — fall through
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
        setTimeout(() => { copied = false; }, 2000);
      } catch {
        // Clipboard not available
      }
    }
  }
</script>

<Button
  onclick={share}
  variant="outline"
  class="border-emerald-600 text-emerald-300 hover:bg-emerald-900/50"
>
  {copied ? '✓ Copied!' : '↑ Share Results'}
</Button>
