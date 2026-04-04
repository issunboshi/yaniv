<script lang="ts">
  import * as Accordion from '$lib/components/ui/accordion/index.js';

  const sections = [
    {
      id: 'overview',
      title: 'Overview & Objective',
      content: `Yaniv is a card game for 2–6 players. The goal is to be the first to reduce your hand value to 7 or below and call "Yaniv!" to end the round. Scores accumulate across rounds. The first player to exceed the score limit is eliminated. The last player remaining wins.`,
    },
    {
      id: 'setup',
      title: 'Setup & Deal',
      content: `Use a standard 54-card deck (52 cards + 2 Jokers). Deal 5 cards to each player. Place the remaining cards face-down as the draw pile, then flip one card to start the discard pile.`,
    },
    {
      id: 'values',
      title: 'Card Values',
      content: `Number cards (2–10): face value. Aces: 1 point. Face cards (J, Q, K): 10 points each. Jokers: 0 points.`,
    },
    {
      id: 'turns',
      title: 'Turn Actions',
      content: `On your turn: (1) Discard one or more cards — singles, pairs, triples, or runs of 3+ consecutive ranks in the same suit — then (2) Draw one card from either the draw pile or the top of the discard pile. When a set is discarded, you may pick up the first or last card of that set.`,
    },
    {
      id: 'yaniv',
      title: 'Calling Yaniv',
      content: `When your hand value is 7 or below (configurable), you may call "Yaniv!" at the start of your turn instead of playing. This ends the round immediately.`,
    },
    {
      id: 'assaf',
      title: 'Assaf',
      content: `After a Yaniv call, any other player whose hand value is equal to or lower than the caller's may call "Assaf!" The Yaniv caller then receives their hand value PLUS a 30-point penalty (configurable). The Assaf-er scores 0 for the round. If multiple players could Assaf, only one may do so.`,
    },
    {
      id: 'scoring',
      title: 'Scoring & Halving',
      content: `Successful Yaniv: the caller scores 0, all other players add their hand value to their running total. If a player's cumulative total lands exactly on a multiple of 50 (50, 100, 150…), their score is either halved or reduced by 50, depending on the game setting. Players whose total exceeds the score limit (default 200) are eliminated.`,
    },
    {
      id: 'winning',
      title: 'Winning',
      content: `The game continues round after round. When only one player remains at or below the score limit, that player wins!`,
    },
    {
      id: 'variants',
      title: 'Variant Rules',
      content: `This app supports configurable rules: Score limit (100 / 200 / 300), Yaniv threshold (5 / 7), Assaf penalty (25 / 30 / 35), Halving on/off, Assaf on/off, Jokers on/off.`,
    },
  ];
</script>

<Accordion.Root type="single" collapsible class="space-y-2">
  {#each sections as section}
    <Accordion.Item value={section.id} class="rounded-lg border border-emerald-800/60 bg-emerald-950/50 overflow-hidden">
      <Accordion.Trigger class="w-full px-4 py-3 text-left text-amber-400 font-semibold hover:text-amber-300 hover:bg-emerald-900/40 transition-colors flex items-center justify-between">
        {section.title}
      </Accordion.Trigger>
      <Accordion.Content class="px-4 pb-4 text-sm text-emerald-200/80 leading-relaxed">
        {section.content}
      </Accordion.Content>
    </Accordion.Item>
  {/each}
</Accordion.Root>
