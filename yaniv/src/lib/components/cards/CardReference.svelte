<script lang="ts">
  import { CARD_VALUES } from '$lib/constants';

  const suits = ['♠', '♥', '♦', '♣'];

  // Number cards: A, 2-10
  const numberCards = [
    { rank: 'A', value: 1 },
    ...['2','3','4','5','6','7','8','9','10'].map(r => ({ rank: r, value: CARD_VALUES[r] })),
  ];

  // Face cards
  const faceCards = ['J', 'Q', 'K'].map(r => ({ rank: r, value: 10 }));

  // Discard combinations
  const combinations = [
    {
      name: 'Single',
      description: 'Any one card.',
      example: ['7♠'],
    },
    {
      name: 'Pair',
      description: 'Two cards of the same rank.',
      example: ['Q♥', 'Q♣'],
    },
    {
      name: 'Triple',
      description: 'Three cards of the same rank.',
      example: ['5♠', '5♥', '5♦'],
    },
    {
      name: 'Run',
      description: '3 or more consecutive ranks of the same suit.',
      example: ['3♠', '4♠', '5♠'],
    },
  ];

  function isRedSuit(suit: string) {
    return suit === '♥' || suit === '♦';
  }
</script>

<!-- Number Cards -->
<section class="mb-6">
  <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Number Cards</h2>
  <div class="flex flex-wrap gap-2">
    {#each numberCards as card}
      <div class="flex flex-col items-center justify-center rounded-lg border border-emerald-700/50 bg-emerald-900/50 w-12 h-16 shadow-sm">
        <span class="text-base font-bold text-emerald-200">{card.rank}</span>
        <span class="text-emerald-600 text-xs">{suits[0]}</span>
        <span class="text-xs text-amber-400 font-semibold">{card.value}pt</span>
      </div>
    {/each}
  </div>
</section>

<!-- Face Cards -->
<section class="mb-6">
  <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Face Cards</h2>
  <div class="flex flex-wrap gap-2 items-start">
    {#each faceCards as card}
      <div class="flex flex-col items-center justify-center rounded-lg border border-emerald-700/50 bg-emerald-900/50 w-12 h-16 shadow-sm">
        <span class="text-base font-bold text-emerald-200">{card.rank}</span>
        <span class="text-red-400 text-xs">♥</span>
        <span class="text-xs text-amber-400 font-semibold">10pt</span>
      </div>
    {/each}
    <p class="self-center text-xs text-emerald-500 ml-2">J, Q, K all worth 10 points</p>
  </div>
</section>

<!-- Jokers -->
<section class="mb-6">
  <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Jokers</h2>
  <div class="flex items-center gap-3">
    <div class="flex flex-col items-center justify-center rounded-lg border border-amber-700/50 bg-amber-950/40 w-12 h-16 shadow-sm">
      <span class="text-xl">🃏</span>
      <span class="text-xs text-amber-400 font-semibold">0pt</span>
    </div>
    <p class="text-xs text-emerald-500">Jokers are worth 0 points — the best card to hold!</p>
  </div>
</section>

<!-- All suits for reference -->
<section class="mb-6">
  <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Suits</h2>
  <div class="flex gap-3">
    {#each suits as suit}
      <div class="flex items-center justify-center rounded-lg border border-emerald-800/40 bg-emerald-900/40 w-10 h-10">
        <span class="text-xl {isRedSuit(suit) ? 'text-red-400' : 'text-emerald-200'}">{suit}</span>
      </div>
    {/each}
    <p class="self-center text-xs text-emerald-500 ml-1">Runs must be same suit</p>
  </div>
</section>

<!-- Valid Discard Combinations -->
<section>
  <h2 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Valid Discard Combinations</h2>
  <div class="space-y-3">
    {#each combinations as combo}
      <div class="rounded-lg border border-emerald-800/50 bg-emerald-950/50 px-4 py-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-semibold text-sm text-emerald-200">{combo.name}</p>
            <p class="text-xs text-emerald-500 mt-0.5">{combo.description}</p>
          </div>
          <div class="flex gap-1 shrink-0">
            {#each combo.example as card}
              {@const isRed = card.includes('♥') || card.includes('♦')}
              <div class="flex items-center justify-center rounded border border-emerald-700/50 bg-emerald-900/60 px-1.5 py-0.5">
                <span class="text-xs font-bold {isRed ? 'text-red-400' : 'text-emerald-200'}">{card}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
</section>
