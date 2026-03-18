# Yaniv Score Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Balatro-inspired mobile-first webapp for tracking Yaniv card game scores, with rules, stats, history, and configurable variants.

**Architecture:** SvelteKit SPA with file-based routing. All state in localStorage via Svelte 5 runes in `.svelte.ts` files (client-only, safe for this use case). Score calculation is a pure function library, tested independently. shadcn-svelte provides UI primitives, heavily themed to match Balatro's dark casino aesthetic.

**Tech Stack:** SvelteKit (Svelte 5), shadcn-svelte, Tailwind CSS v4, TypeScript, Vitest, @sveltejs/adapter-static, @vite-pwa/sveltekit, Howler.js

> **Note:** We use `adapter-static` (not `adapter-cloudflare`) since the app is a pure client-side SPA with `ssr = false`. Cloudflare Pages serves the static output directly. The Cloudflare adapter is for SSR workloads.

**Spec:** `docs/superpowers/specs/2026-03-18-yaniv-webapp-design.md`

---

## File Structure

```
src/
├── app.html                          # HTML shell
├── app.css                           # Global CSS: Balatro theme, CRT effects, noise texture
├── lib/
│   ├── components/
│   │   ├── ui/                       # shadcn-svelte components (auto-generated)
│   │   ├── scoreboard/
│   │   │   ├── Scoreboard.svelte     # Main scoreboard table
│   │   │   ├── PlayerColumn.svelte   # Single player's score column
│   │   │   └── RoundRow.svelte       # Single round in history
│   │   ├── round-entry/
│   │   │   ├── RoundEntryPanel.svelte # Slide-up round entry
│   │   │   ├── PlayerScoreInput.svelte # Number pad input per player
│   │   │   └── YanivCallerSelect.svelte # Select who called Yaniv
│   │   ├── game-setup/
│   │   │   ├── PlayerForm.svelte     # Add/edit player name, avatar, color
│   │   │   ├── VariantSelect.svelte  # Preset variant picker
│   │   │   └── SettingsForm.svelte   # Custom game settings form
│   │   ├── game-over/
│   │   │   ├── ResultsScreen.svelte  # Final standings + highlights
│   │   │   └── ShareButton.svelte    # Share via clipboard/Web Share API
│   │   ├── rules/
│   │   │   └── RulesAccordion.svelte # Collapsible rules sections
│   │   ├── stats/
│   │   │   ├── Leaderboard.svelte    # Win rate leaderboard
│   │   │   └── PlayerDetail.svelte   # Per-player stat breakdown
│   │   ├── cards/
│   │   │   └── CardReference.svelte  # Visual card value display
│   │   ├── layout/
│   │   │   ├── Nav.svelte            # Bottom navigation bar
│   │   │   ├── Header.svelte         # Page header with back button
│   │   │   └── CrtOverlay.svelte     # CRT scanline/vignette effect
│   │   └── timer/
│   │       └── TableTimer.svelte     # Advisory countdown timer
│   ├── engine/
│   │   ├── scoring.ts                # Pure score calculation functions
│   │   ├── scoring.test.ts           # Tests for scoring logic
│   │   ├── stats.ts                  # Derive PlayerStats from Game[]
│   │   └── stats.test.ts            # Tests for stats derivation
│   ├── stores/
│   │   ├── game.svelte.ts            # Active game state + actions
│   │   ├── storage.svelte.ts         # localStorage read/write with versioning
│   │   ├── players.svelte.ts         # KnownPlayer registry
│   │   ├── settings.svelte.ts        # App-level settings (defaults, sound, theme)
│   │   └── audio.svelte.ts           # Sound effect manager
│   ├── types.ts                      # All TypeScript interfaces (from spec)
│   ├── constants.ts                  # Default settings, variant presets, card values
│   └── utils.ts                      # UUID generation, date formatting helpers
├── routes/
│   ├── +layout.svelte                # Root layout: nav, CRT overlay, PWA head
│   ├── +layout.ts                    # Prerender config
│   ├── +page.svelte                  # Home page
│   ├── game/
│   │   ├── new/+page.svelte          # New game setup
│   │   └── [id]/
│   │       ├── +page.svelte          # Active game scoreboard
│   │       └── results/+page.svelte  # Game over results
│   ├── rules/+page.svelte            # Rules page
│   ├── history/+page.svelte          # Game history list
│   ├── stats/+page.svelte            # Player statistics
│   ├── cards/+page.svelte            # Card reference
│   └── settings/+page.svelte         # App settings
static/
├── sounds/                           # Audio files (yaniv, assaf, halving, elimination, win)
└── favicon.svg                       # App icon
├── tests/
│   └── e2e/                          # Playwright e2e tests (stretch goal)
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `src/app.html`, `src/app.css`
- Create: `src/routes/+layout.svelte`, `src/routes/+layout.ts`, `src/routes/+page.svelte`

- [ ] **Step 1: Create SvelteKit project**

```bash
cd /Users/cliffwilliams/code/yaniv
npx sv create . --types ts --template minimal --add tailwindcss,eslint,prettier --install pnpm
```

Accept defaults. This creates the full SvelteKit scaffold with TypeScript and Tailwind.

- [ ] **Step 2: Install shadcn-svelte**

```bash
pnpm dlx shadcn-svelte@latest init
```

Accept defaults: base color Zinc, CSS file `src/app.css`, aliases `$lib`, `$lib/components`, `$lib/components/ui`.

- [ ] **Step 3: Add initial shadcn-svelte components**

```bash
pnpm dlx shadcn-svelte@latest add button card dialog accordion tabs input badge separator avatar scroll-area sheet sonner toggle
```

- [ ] **Step 4: Install additional dependencies**

```bash
pnpm add -D @sveltejs/adapter-static @vite-pwa/sveltekit vitest
pnpm add howler uuid
pnpm add -D @types/howler @types/uuid
```

- [ ] **Step 5: Configure static adapter for SPA**

In `svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html' // SPA mode: all routes serve index.html
    }),
    serviceWorker: {
      register: false
    }
  }
};

export default config;
```

- [ ] **Step 6: Configure Vite with PWA plugin**

In `vite.config.ts`:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Yaniv Score Tracker',
        short_name: 'Yaniv',
        description: 'Track scores for the card game Yaniv',
        theme_color: '#1a3a2a',
        background_color: '#0f1f17',
        display: 'standalone',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}']
      }
    })
  ],
  test: {
    include: ['src/**/*.test.ts']
  }
});
```

- [ ] **Step 7: Disable SSR for client-only SPA**

Create `src/routes/+layout.ts`:

```typescript
export const ssr = false; // Client-only SPA — all state in localStorage
```

> **Important:** Do NOT set `prerender = true` globally. Dynamic routes like `/game/[id]` cannot be prerendered. The `adapter-static` with `fallback: 'index.html'` handles SPA routing correctly.

- [ ] **Step 8: Verify dev server runs**

```bash
pnpm dev
```

Expected: SvelteKit dev server starts at localhost:5173 with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold SvelteKit project with shadcn-svelte, Tailwind, and Cloudflare Pages"
```

---

## Task 2: Type Definitions & Constants

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Write type definitions**

Create `src/lib/types.ts` with all interfaces from the spec:

```typescript
export interface StorageEnvelope {
  schemaVersion: number;
  knownPlayers: KnownPlayer[];
  games: Game[];
  appSettings: AppSettings;
}

export interface KnownPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Game {
  id: string;
  players: GamePlayer[];
  rounds: Round[];
  settings: GameSettings;
  status: 'in_progress' | 'completed' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  winnerId?: string;
}

export interface GamePlayer {
  knownPlayerId: string;
  name: string;
  avatar: string;
  color: string;
  eliminated: boolean;
  eliminatedAtRound?: number;
}

export interface Round {
  number: number;
  handValues: Record<string, number>;
  appliedScores: Record<string, number>;
  yanivCallerId: string;
  assafPlayerId?: string;
  wasAssafed: boolean;
  halvingEvents: string[];
  eliminations: string[];
  timestamp: string;
}

export interface GameSettings {
  scoreLimit: number;
  yanivThreshold: number;
  halvingEnabled: boolean;
  halvingMultiple: number;
  assafEnabled: boolean;
  assafPenalty: number;
  tableTimerEnabled: boolean;
  tableTimerSeconds: number;
  jokersEnabled: boolean;
  variantName: string;
}

export interface AppSettings {
  defaultGameSettings: GameSettings;
  soundEnabled: boolean;
  soundVolume: number;
  theme: 'dark' | 'light';
}

export interface PlayerStats {
  knownPlayerId: string;
  name: string;
  avatar: string;
  gamesPlayed: number;
  wins: number;
  yanivCalls: number;
  successfulYanivs: number;
  timesAssafed: number;
  timesPerformedAssaf: number;
  averageFinalScore: number;
  halvingEvents: number;
  bestComeback: number;
}
```

- [ ] **Step 2: Write constants**

Create `src/lib/constants.ts`:

```typescript
import type { GameSettings } from './types';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'yaniv-app';
export const STORAGE_WARNING_BYTES = 4 * 1024 * 1024; // 4MB

export const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'
] as const;

export const PLAYER_AVATARS = [
  '🃏', '🂡', '🎴', '🎲', '🎯', '🏆'
] as const;

export const VARIANT_CLASSIC: GameSettings = {
  scoreLimit: 200,
  yanivThreshold: 7,
  halvingEnabled: true,
  halvingMultiple: 50,
  assafEnabled: true,
  assafPenalty: 30,
  tableTimerEnabled: false,
  tableTimerSeconds: 60,
  jokersEnabled: true,
  variantName: 'Classic',
};

export const VARIANT_QUICK: GameSettings = {
  ...VARIANT_CLASSIC,
  scoreLimit: 100,
  yanivThreshold: 5,
  assafPenalty: 25,
  variantName: 'Quick',
};

export const VARIANT_MARATHON: GameSettings = {
  ...VARIANT_CLASSIC,
  scoreLimit: 300,
  variantName: 'Marathon',
};

export const VARIANTS = {
  Classic: VARIANT_CLASSIC,
  Quick: VARIANT_QUICK,
  Marathon: VARIANT_MARATHON,
} as const;

export const CARD_VALUES: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'Joker': 0,
};
```

- [ ] **Step 3: Write utils**

Create `src/lib/utils.ts` (extend the existing one from shadcn-svelte if present):

```typescript
import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts src/lib/utils.ts
git commit -m "feat: add type definitions, constants, and utility functions"
```

---

## Task 3: Score Calculation Engine (TDD)

**Files:**
- Create: `src/lib/engine/scoring.ts`
- Create: `src/lib/engine/scoring.test.ts`

This is the core logic of the app — pure functions, no side effects, thoroughly tested.

- [ ] **Step 1: Write failing tests for `calculateRoundScores`**

Create `src/lib/engine/scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateRoundScores, getRunningTotals, checkElimination, checkHalving } from './scoring';
import type { GameSettings, Round, GamePlayer } from '$lib/types';
import { VARIANT_CLASSIC } from '$lib/constants';

const settings = VARIANT_CLASSIC;

describe('calculateRoundScores', () => {
  it('successful yaniv: caller gets 0, others get hand value', () => {
    const handValues = { p1: 5, p2: 12, p3: 8 };
    const result = calculateRoundScores(handValues, 'p1', undefined, settings);

    expect(result.appliedScores.p1).toBe(0);
    expect(result.appliedScores.p2).toBe(12);
    expect(result.appliedScores.p3).toBe(8);
    expect(result.wasAssafed).toBe(false);
  });

  it('assaf: caller gets hand + penalty, assafer gets 0', () => {
    const handValues = { p1: 5, p2: 3, p3: 8 };
    const result = calculateRoundScores(handValues, 'p1', 'p2', settings);

    expect(result.appliedScores.p1).toBe(5 + 30); // hand + penalty
    expect(result.appliedScores.p2).toBe(0);       // assafer
    expect(result.appliedScores.p3).toBe(8);
    expect(result.wasAssafed).toBe(true);
  });

  it('assaf disabled: caller always gets 0 on valid call', () => {
    const noAssafSettings = { ...settings, assafEnabled: false };
    const handValues = { p1: 5, p2: 3, p3: 8 };
    const result = calculateRoundScores(handValues, 'p1', undefined, noAssafSettings);

    expect(result.appliedScores.p1).toBe(0);
    expect(result.appliedScores.p2).toBe(3);
    expect(result.wasAssafed).toBe(false);
  });
});

describe('checkHalving', () => {
  it('halves score at exact multiple of 50', () => {
    expect(checkHalving(100, settings)).toBe(50);
    expect(checkHalving(50, settings)).toBe(25);
    expect(checkHalving(150, settings)).toBe(75);
    expect(checkHalving(200, settings)).toBe(100);
  });

  it('does not halve at non-multiples', () => {
    expect(checkHalving(99, settings)).toBe(99);
    expect(checkHalving(51, settings)).toBe(51);
    expect(checkHalving(0, settings)).toBe(0);
  });

  it('does not halve when halving disabled', () => {
    const noHalving = { ...settings, halvingEnabled: false };
    expect(checkHalving(100, noHalving)).toBe(100);
  });
});

describe('checkElimination', () => {
  it('eliminates when score exceeds limit', () => {
    expect(checkElimination(201, settings)).toBe(true);
    expect(checkElimination(200, settings)).toBe(false);
    expect(checkElimination(199, settings)).toBe(false);
  });
});

describe('getRunningTotals', () => {
  it('sums applied scores across rounds', () => {
    const rounds: Round[] = [
      {
        number: 1,
        handValues: { p1: 5, p2: 12 },
        appliedScores: { p1: 0, p2: 12 },
        yanivCallerId: 'p1', wasAssafed: false,
        halvingEvents: [], eliminations: [],
        timestamp: '2026-01-01T00:00:00Z'
      },
      {
        number: 2,
        handValues: { p1: 7, p2: 3 },
        appliedScores: { p1: 7, p2: 0 },
        yanivCallerId: 'p2', wasAssafed: false,
        halvingEvents: [], eliminations: [],
        timestamp: '2026-01-01T00:01:00Z'
      }
    ];
    const totals = getRunningTotals(rounds);
    expect(totals.p1).toBe(7);
    expect(totals.p2).toBe(12);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/lib/engine/scoring.test.ts
```

Expected: FAIL — module `./scoring` not found.

- [ ] **Step 3: Implement scoring engine**

Create `src/lib/engine/scoring.ts`:

```typescript
import type { GameSettings, Round } from '$lib/types';

export interface RoundResult {
  appliedScores: Record<string, number>;
  wasAssafed: boolean;
}

export function calculateRoundScores(
  handValues: Record<string, number>,
  yanivCallerId: string,
  assafPlayerId: string | undefined,
  settings: GameSettings
): RoundResult {
  const appliedScores: Record<string, number> = {};
  const wasAssafed = settings.assafEnabled && assafPlayerId !== undefined;

  for (const [playerId, handValue] of Object.entries(handValues)) {
    if (wasAssafed && playerId === yanivCallerId) {
      appliedScores[playerId] = handValue + settings.assafPenalty;
    } else if (wasAssafed && playerId === assafPlayerId) {
      appliedScores[playerId] = 0;
    } else if (!wasAssafed && playerId === yanivCallerId) {
      appliedScores[playerId] = 0;
    } else {
      appliedScores[playerId] = handValue;
    }
  }

  return { appliedScores, wasAssafed };
}

export function checkHalving(score: number, settings: GameSettings): number {
  if (!settings.halvingEnabled) return score;
  if (score > 0 && score % settings.halvingMultiple === 0) {
    return Math.floor(score / 2);
  }
  return score;
}

export function checkElimination(score: number, settings: GameSettings): boolean {
  return score > settings.scoreLimit;
}

export function getRunningTotals(rounds: Round[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const round of rounds) {
    for (const [playerId, score] of Object.entries(round.appliedScores)) {
      totals[playerId] = (totals[playerId] ?? 0) + score;
    }
  }
  return totals;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/engine/scoring.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Add integration test for halving + appliedScores interaction**

This is the most bug-prone part of the system: when halving triggers, `appliedScores` gets adjusted so that `getRunningTotals` produces correct cumulative totals. Add to `scoring.test.ts`:

```typescript
describe('halving + running totals integration', () => {
  it('appliedScores adjusted for halving produce correct running totals', () => {
    // Simulate: player has 45 points, then scores 5 → total 50 → halves to 25
    // The appliedScore should be adjusted so running total = 25 (i.e. appliedScore = 25 - 45 = -20)
    const round1: Round = {
      number: 1, handValues: { p1: 45 }, appliedScores: { p1: 45 },
      yanivCallerId: 'p2', wasAssafed: false,
      halvingEvents: [], eliminations: [], timestamp: '2026-01-01T00:00:00Z'
    };
    // After halving adjustment in addRound, appliedScore becomes: 25 - 45 = -20
    const round2: Round = {
      number: 2, handValues: { p1: 5 }, appliedScores: { p1: -20 },
      yanivCallerId: 'p2', wasAssafed: false,
      halvingEvents: ['p1'], eliminations: [], timestamp: '2026-01-01T00:01:00Z'
    };
    const totals = getRunningTotals([round1, round2]);
    expect(totals.p1).toBe(25); // 45 + (-20) = 25
  });
});
```

> **Note:** The `appliedScores` field stores the adjusted delta (not raw hand value) after halving. This is intentional — `getRunningTotals` sums appliedScores directly, and halving is baked into the delta. Add a code comment in `scoring.ts` explaining this.

- [ ] **Step 6: Run all tests**

```bash
pnpm vitest run src/lib/engine/scoring.test.ts
```

Expected: All PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/engine/scoring.ts src/lib/engine/scoring.test.ts
git commit -m "feat: implement score calculation engine with tests"
```

---

## Task 4: Stats Derivation Engine (TDD)

**Files:**
- Create: `src/lib/engine/stats.ts`
- Create: `src/lib/engine/stats.test.ts`

- [ ] **Step 1: Write failing tests for stats derivation**

Create `src/lib/engine/stats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { derivePlayerStats, deriveGlobalStats } from './stats';
import type { Game } from '$lib/types';
import { VARIANT_CLASSIC } from '$lib/constants';

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    players: [
      { knownPlayerId: 'kp1', name: 'Alice', avatar: '🃏', color: '#e74c3c', eliminated: false },
      { knownPlayerId: 'kp2', name: 'Bob', avatar: '🂡', color: '#3498db', eliminated: true, eliminatedAtRound: 3 },
    ],
    rounds: [
      {
        number: 1, handValues: { kp1: 5, kp2: 12 }, appliedScores: { kp1: 0, kp2: 12 },
        yanivCallerId: 'kp1', wasAssafed: false, halvingEvents: [], eliminations: [],
        timestamp: '2026-01-01T00:00:00Z',
      },
      {
        number: 2, handValues: { kp1: 7, kp2: 3 }, appliedScores: { kp1: 7, kp2: 0 },
        yanivCallerId: 'kp2', wasAssafed: false, halvingEvents: [], eliminations: [],
        timestamp: '2026-01-01T00:01:00Z',
      },
      {
        number: 3, handValues: { kp1: 4, kp2: 6 }, appliedScores: { kp1: 0, kp2: 206 },
        yanivCallerId: 'kp1', wasAssafed: false, halvingEvents: [], eliminations: ['kp2'],
        timestamp: '2026-01-01T00:02:00Z',
      },
    ],
    settings: VARIANT_CLASSIC,
    status: 'completed',
    createdAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T00:02:00Z',
    winnerId: 'kp1',
    ...overrides,
  };
}

describe('derivePlayerStats', () => {
  it('calculates wins and games played', () => {
    const games = [makeGame()];
    const stats = derivePlayerStats(games);

    const alice = stats.find(s => s.knownPlayerId === 'kp1')!;
    expect(alice.gamesPlayed).toBe(1);
    expect(alice.wins).toBe(1);

    const bob = stats.find(s => s.knownPlayerId === 'kp2')!;
    expect(bob.gamesPlayed).toBe(1);
    expect(bob.wins).toBe(0);
  });

  it('counts yaniv calls and assaf events', () => {
    const games = [makeGame()];
    const stats = derivePlayerStats(games);

    const alice = stats.find(s => s.knownPlayerId === 'kp1')!;
    expect(alice.yanivCalls).toBe(2);
    expect(alice.successfulYanivs).toBe(2);
    expect(alice.timesAssafed).toBe(0);
  });
});

describe('deriveGlobalStats', () => {
  it('counts total games and rounds', () => {
    const games = [makeGame()];
    const global = deriveGlobalStats(games);
    expect(global.totalGames).toBe(1);
    expect(global.totalRounds).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/lib/engine/stats.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement stats engine**

Create `src/lib/engine/stats.ts`:

```typescript
import type { Game, PlayerStats } from '$lib/types';

export interface GlobalStats {
  totalGames: number;
  totalRounds: number;
  mostCommonWinner: { name: string; wins: number } | null;
  longestGame: number;
}

export function derivePlayerStats(games: Game[]): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  for (const game of games) {
    if (game.status === 'abandoned') continue;

    for (const player of game.players) {
      if (!statsMap.has(player.knownPlayerId)) {
        statsMap.set(player.knownPlayerId, {
          knownPlayerId: player.knownPlayerId,
          name: player.name,
          avatar: player.avatar,
          gamesPlayed: 0,
          wins: 0,
          yanivCalls: 0,
          successfulYanivs: 0,
          timesAssafed: 0,
          timesPerformedAssaf: 0,
          averageFinalScore: 0,
          halvingEvents: 0,
          bestComeback: 0,
        });
      }

      const stat = statsMap.get(player.knownPlayerId)!;
      stat.name = player.name; // Use latest name
      stat.avatar = player.avatar;
      stat.gamesPlayed++;

      if (game.winnerId === player.knownPlayerId) {
        stat.wins++;
      }

      for (const round of game.rounds) {
        if (round.yanivCallerId === player.knownPlayerId) {
          stat.yanivCalls++;
          if (!round.wasAssafed) {
            stat.successfulYanivs++;
          } else {
            stat.timesAssafed++;
          }
        }
        if (round.assafPlayerId === player.knownPlayerId) {
          stat.timesPerformedAssaf++;
        }
        if (round.halvingEvents.includes(player.knownPlayerId)) {
          stat.halvingEvents++;
          // bestComeback = largest score recovered from a single halving
          // appliedScores for halved player = halvedTotal - prevTotal (negative = recovery)
          const recovery = -(round.appliedScores[player.knownPlayerId] ?? 0);
          if (recovery > stat.bestComeback) {
            stat.bestComeback = recovery;
          }
        }
      }
    }
  }

  // Calculate average final scores
  for (const stat of statsMap.values()) {
    if (stat.gamesPlayed > 0) {
      let totalFinalScore = 0;
      let counted = 0;
      for (const game of games) {
        if (game.status === 'abandoned') continue;
        const player = game.players.find(p => p.knownPlayerId === stat.knownPlayerId);
        if (!player) continue;
        let score = 0;
        for (const round of game.rounds) {
          score += round.appliedScores[player.knownPlayerId] ?? 0;
        }
        totalFinalScore += score;
        counted++;
      }
      stat.averageFinalScore = counted > 0 ? Math.round(totalFinalScore / counted) : 0;
    }
  }

  return Array.from(statsMap.values());
}

export function deriveGlobalStats(games: Game[]): GlobalStats {
  const completed = games.filter(g => g.status === 'completed');
  const totalRounds = completed.reduce((sum, g) => sum + g.rounds.length, 0);

  const winCounts = new Map<string, { name: string; wins: number }>();
  for (const game of completed) {
    if (!game.winnerId) continue;
    const winner = game.players.find(p => p.knownPlayerId === game.winnerId);
    if (!winner) continue;
    const entry = winCounts.get(game.winnerId) ?? { name: winner.name, wins: 0 };
    entry.wins++;
    winCounts.set(game.winnerId, entry);
  }

  let mostCommonWinner: { name: string; wins: number } | null = null;
  for (const entry of winCounts.values()) {
    if (!mostCommonWinner || entry.wins > mostCommonWinner.wins) {
      mostCommonWinner = entry;
    }
  }

  const longestGame = completed.reduce((max, g) => Math.max(max, g.rounds.length), 0);

  return {
    totalGames: completed.length,
    totalRounds,
    mostCommonWinner,
    longestGame,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/engine/stats.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine/stats.ts src/lib/engine/stats.test.ts
git commit -m "feat: implement stats derivation engine with tests"
```

---

## Task 5: localStorage Store with Versioning

**Files:**
- Create: `src/lib/stores/storage.svelte.ts`
- Create: `src/lib/stores/game.svelte.ts`
- Create: `src/lib/stores/players.svelte.ts`
- Create: `src/lib/stores/settings.svelte.ts`

- [ ] **Step 1: Implement storage layer**

Create `src/lib/stores/storage.svelte.ts`:

```typescript
import { SCHEMA_VERSION, STORAGE_KEY, STORAGE_WARNING_BYTES } from '$lib/constants';
import type { StorageEnvelope, AppSettings, Game, KnownPlayer } from '$lib/types';
import { VARIANT_CLASSIC } from '$lib/constants';

const defaultAppSettings: AppSettings = {
  defaultGameSettings: VARIANT_CLASSIC,
  soundEnabled: true,
  soundVolume: 0.7,
  theme: 'dark',
};

const defaultEnvelope: StorageEnvelope = {
  schemaVersion: SCHEMA_VERSION,
  knownPlayers: [],
  games: [],
  appSettings: defaultAppSettings,
};

function load(): StorageEnvelope {
  if (typeof window === 'undefined') return { ...defaultEnvelope };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultEnvelope };
    const data = JSON.parse(raw) as StorageEnvelope;
    // Future: run migrations if data.schemaVersion < SCHEMA_VERSION
    return data;
  } catch {
    return { ...defaultEnvelope };
  }
}

function save(envelope: StorageEnvelope): boolean {
  try {
    const json = JSON.stringify(envelope);
    if (json.length > STORAGE_WARNING_BYTES) {
      console.warn(`Yaniv storage approaching limit: ${(json.length / 1024 / 1024).toFixed(1)}MB`);
    }
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return false;
  }
}

let envelope = $state<StorageEnvelope>(load());

export const storage = {
  get data() { return envelope; },
  get games() { return envelope.games; },
  get knownPlayers() { return envelope.knownPlayers; },
  get appSettings() { return envelope.appSettings; },

  saveGame(game: Game) {
    const idx = envelope.games.findIndex(g => g.id === game.id);
    if (idx >= 0) {
      envelope.games[idx] = game;
    } else {
      envelope.games.push(game);
    }
    save(envelope);
  },

  deleteGame(gameId: string) {
    envelope.games = envelope.games.filter(g => g.id !== gameId);
    save(envelope);
  },

  clearAllGames() {
    envelope.games = [];
    save(envelope);
  },

  saveKnownPlayer(player: KnownPlayer) {
    const idx = envelope.knownPlayers.findIndex(p => p.id === player.id);
    if (idx >= 0) {
      envelope.knownPlayers[idx] = player;
    } else {
      envelope.knownPlayers.push(player);
    }
    save(envelope);
  },

  updateAppSettings(settings: Partial<AppSettings>) {
    envelope.appSettings = { ...envelope.appSettings, ...settings };
    save(envelope);
  },

  clearAll() {
    envelope = { ...defaultEnvelope };
    save(envelope);
  },
};
```

- [ ] **Step 2: Implement game store (active game actions)**

Create `src/lib/stores/game.svelte.ts`:

```typescript
import { storage } from './storage.svelte';
import { calculateRoundScores, checkHalving, checkElimination, getRunningTotals } from '$lib/engine/scoring';
import { generateId } from '$lib/utils';
import type { Game, GamePlayer, GameSettings, Round } from '$lib/types';

let activeGame = $state<Game | null>(null);

export const gameStore = {
  get active() { return activeGame; },

  get runningTotals() {
    if (!activeGame) return {};
    return getRunningTotals(activeGame.rounds);
  },

  startGame(players: GamePlayer[], settings: GameSettings) {
    activeGame = {
      id: generateId(),
      players,
      rounds: [],
      settings,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };
    storage.saveGame(activeGame);
    return activeGame.id;
  },

  loadGame(gameId: string) {
    const game = storage.games.find(g => g.id === gameId);
    if (game) activeGame = game;
    return !!game;
  },

  addRound(handValues: Record<string, number>, yanivCallerId: string, assafPlayerId?: string) {
    if (!activeGame) return;

    const { appliedScores, wasAssafed } = calculateRoundScores(
      handValues, yanivCallerId, assafPlayerId, activeGame.settings
    );

    // Calculate totals before this round
    const prevTotals = getRunningTotals(activeGame.rounds);

    // Apply scores and check halving/elimination
    const halvingEvents: string[] = [];
    const eliminations: string[] = [];

    for (const player of activeGame.players) {
      if (player.eliminated) continue;
      const pid = player.knownPlayerId;
      let newTotal = (prevTotals[pid] ?? 0) + (appliedScores[pid] ?? 0);

      // Check halving
      const halvedTotal = checkHalving(newTotal, activeGame.settings);
      if (halvedTotal !== newTotal) {
        halvingEvents.push(pid);
        // Adjust applied score to account for halving
        appliedScores[pid] = halvedTotal - (prevTotals[pid] ?? 0);
        newTotal = halvedTotal;
      }

      // Check elimination
      if (checkElimination(newTotal, activeGame.settings)) {
        eliminations.push(pid);
        player.eliminated = true;
        player.eliminatedAtRound = activeGame.rounds.length + 1;
      }
    }

    const round: Round = {
      number: activeGame.rounds.length + 1,
      handValues,
      appliedScores,
      yanivCallerId,
      assafPlayerId,
      wasAssafed,
      halvingEvents,
      eliminations,
      timestamp: new Date().toISOString(),
    };

    activeGame.rounds.push(round);

    // Check game over
    const activePlayers = activeGame.players.filter(p => !p.eliminated);
    if (activePlayers.length <= 1) {
      activeGame.status = 'completed';
      activeGame.completedAt = new Date().toISOString();
      activeGame.winnerId = activePlayers[0]?.knownPlayerId;
    }

    storage.saveGame(activeGame);
    return round;
  },

  undoLastRound() {
    if (!activeGame || activeGame.rounds.length === 0) return;

    const lastRound = activeGame.rounds.pop()!;

    // Restore eliminated players from this round
    for (const pid of lastRound.eliminations) {
      const player = activeGame.players.find(p => p.knownPlayerId === pid);
      if (player) {
        player.eliminated = false;
        player.eliminatedAtRound = undefined;
      }
    }

    // Restore game status if needed
    if (activeGame.status === 'completed') {
      activeGame.status = 'in_progress';
      activeGame.completedAt = undefined;
      activeGame.winnerId = undefined;
    }

    storage.saveGame(activeGame);
  },

  abandonGame() {
    if (!activeGame) return;
    activeGame.status = 'abandoned';
    activeGame.completedAt = new Date().toISOString();
    storage.saveGame(activeGame);
  },
};
```

- [ ] **Step 3: Implement players store**

Create `src/lib/stores/players.svelte.ts`:

```typescript
import { storage } from './storage.svelte';
import { generateId } from '$lib/utils';
import type { KnownPlayer } from '$lib/types';

export const playersStore = {
  get all() { return storage.knownPlayers; },

  findByName(name: string) {
    return storage.knownPlayers.find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
  },

  getOrCreate(name: string, avatar: string, color: string): KnownPlayer {
    const existing = this.findByName(name);
    if (existing) {
      // Update avatar/color if changed
      const updated = { ...existing, avatar, color };
      storage.saveKnownPlayer(updated);
      return updated;
    }
    const player: KnownPlayer = { id: generateId(), name, avatar, color };
    storage.saveKnownPlayer(player);
    return player;
  },
};
```

- [ ] **Step 4: Implement settings store**

Create `src/lib/stores/settings.svelte.ts`:

```typescript
import { storage } from './storage.svelte';
import type { AppSettings, GameSettings } from '$lib/types';

export const settingsStore = {
  get current() { return storage.appSettings; },

  updateDefaults(gameSettings: Partial<GameSettings>) {
    storage.updateAppSettings({
      defaultGameSettings: { ...storage.appSettings.defaultGameSettings, ...gameSettings },
    });
  },

  setSound(enabled: boolean, volume?: number) {
    storage.updateAppSettings({
      soundEnabled: enabled,
      ...(volume !== undefined ? { soundVolume: volume } : {}),
    });
  },

  setTheme(theme: 'dark' | 'light') {
    storage.updateAppSettings({ theme });
  },
};
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
pnpm check
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/
git commit -m "feat: implement localStorage stores with versioning, game actions, and player registry"
```

---

## Task 6: Balatro Theme & Layout Shell

**Files:**
- Modify: `src/app.css`
- Create: `src/lib/components/layout/Nav.svelte`
- Create: `src/lib/components/layout/Header.svelte`
- Create: `src/lib/components/layout/CrtOverlay.svelte`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Create CRT overlay component**

Create `src/lib/components/layout/CrtOverlay.svelte`:

```svelte
<div class="crt-overlay pointer-events-none fixed inset-0 z-50">
  <div class="scanlines"></div>
  <div class="vignette"></div>
</div>

<style>
  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.03) 2px,
      rgba(0, 0, 0, 0.03) 4px
    );
  }
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 60%,
      rgba(0, 0, 0, 0.4) 100%
    );
  }
</style>
```

- [ ] **Step 2: Create bottom navigation bar**

Create `src/lib/components/layout/Nav.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
</script>

<nav class="fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-800/50 bg-emerald-950/95 backdrop-blur-sm">
  <div class="mx-auto flex max-w-lg items-center justify-around py-2">
    {#each [
      { href: '/', label: 'Home', icon: '🏠' },
      { href: '/rules', label: 'Rules', icon: '📜' },
      { href: '/history', label: 'History', icon: '📊' },
      { href: '/stats', label: 'Stats', icon: '🏆' },
      { href: '/settings', label: 'Settings', icon: '⚙️' },
    ] as item}
      <a
        href={item.href}
        class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors
          {$page.url.pathname === item.href ? 'text-amber-400' : 'text-emerald-300/60 hover:text-emerald-200'}"
      >
        <span class="text-lg">{item.icon}</span>
        <span>{item.label}</span>
      </a>
    {/each}
  </div>
</nav>
```

- [ ] **Step 3: Create page header component**

Create `src/lib/components/layout/Header.svelte`:

```svelte
<script lang="ts">
  interface Props {
    title: string;
    showBack?: boolean;
  }
  let { title, showBack = false }: Props = $props();
</script>

<header class="sticky top-0 z-30 border-b border-emerald-800/50 bg-emerald-950/95 px-4 py-3 backdrop-blur-sm">
  <div class="mx-auto flex max-w-lg items-center gap-3">
    {#if showBack}
      <a href="/" class="text-emerald-300 hover:text-amber-400 transition-colors">←</a>
    {/if}
    <h1 class="font-bold text-lg text-amber-400 tracking-wide">{title}</h1>
  </div>
</header>
```

- [ ] **Step 4: Add Balatro theme to global CSS**

Append to `src/app.css` (after the existing shadcn-svelte imports):

```css
/* Balatro-inspired Yaniv theme */
:root {
  --yaniv-bg: #0f1f17;
  --yaniv-surface: #1a3a2a;
  --yaniv-border: #2d5a3f;
  --yaniv-accent: #f59e0b;
  --yaniv-text: #e2e8d0;
  --yaniv-muted: #6b8f7b;
  --yaniv-danger: #ef4444;
  --yaniv-success: #22c55e;
}

body {
  background-color: var(--yaniv-bg);
  color: var(--yaniv-text);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: 100dvh;
}

/* Noise texture overlay */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}
```

- [ ] **Step 5: Wire up root layout**

Update `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '../app.css';
  import CrtOverlay from '$lib/components/layout/CrtOverlay.svelte';
  import Nav from '$lib/components/layout/Nav.svelte';
  import { pwaInfo } from 'virtual:pwa-info';

  let { children } = $props();
  let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
</script>

<svelte:head>
  {@html webManifestLink}
</svelte:head>

<div class="min-h-dvh pb-20">
  {@render children()}
</div>

<Nav />
<CrtOverlay />
```

- [ ] **Step 6: Verify layout renders**

```bash
pnpm dev
```

Open browser, verify: dark green background, noise texture, CRT effect, bottom nav visible.

- [ ] **Step 7: Commit**

```bash
git add src/app.css src/lib/components/layout/ src/routes/+layout.svelte
git commit -m "feat: add Balatro-inspired theme, CRT overlay, and navigation layout"
```

---

## Task 7: Home Page

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Implement home page**

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card } from '$lib/components/ui/card/index.js';
  import { storage } from '$lib/stores/storage.svelte';

  const inProgressGame = $derived(
    storage.games.find(g => g.status === 'in_progress')
  );
</script>

<div class="mx-auto max-w-lg px-4 pt-12 text-center">
  <div class="mb-8">
    <h1 class="text-5xl font-extrabold tracking-tight text-amber-400 drop-shadow-lg">
      YANIV
    </h1>
    <p class="mt-2 text-emerald-300/70 text-sm tracking-widest uppercase">Score Tracker</p>
  </div>

  <div class="space-y-4">
    <a href="/game/new">
      <Button class="w-full bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-lg py-6 shadow-lg shadow-amber-500/20">
        New Game
      </Button>
    </a>

    {#if inProgressGame}
      <a href="/game/{inProgressGame.id}">
        <Button variant="outline" class="w-full border-emerald-600 text-emerald-300 hover:bg-emerald-900/50 py-4">
          Resume Game ({inProgressGame.players.length} players, round {inProgressGame.rounds.length})
        </Button>
      </a>
    {/if}
  </div>

  <div class="mt-12 grid grid-cols-2 gap-3">
    {#each [
      { href: '/rules', icon: '📜', label: 'Rules' },
      { href: '/cards', icon: '🃏', label: 'Card Values' },
      { href: '/history', icon: '📊', label: 'History' },
      { href: '/stats', icon: '🏆', label: 'Stats' },
    ] as link}
      <a href={link.href}>
        <Card class="bg-emerald-900/40 border-emerald-800/50 p-4 text-center hover:bg-emerald-900/60 transition-colors">
          <span class="text-2xl">{link.icon}</span>
          <p class="mt-1 text-sm text-emerald-300">{link.label}</p>
        </Card>
      </a>
    {/each}
  </div>
</div>
```

- [ ] **Step 2: Verify home page renders**

```bash
pnpm dev
```

Expected: Home page with "YANIV" title, New Game button, and 4 link cards.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: implement home page with new game and quick links"
```

---

## Task 8: New Game Setup Page

**Files:**
- Create: `src/routes/game/new/+page.svelte`
- Create: `src/lib/components/game-setup/PlayerForm.svelte`
- Create: `src/lib/components/game-setup/VariantSelect.svelte`

- [ ] **Step 1: Create PlayerForm component**

Create `src/lib/components/game-setup/PlayerForm.svelte`:

```svelte
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
```

- [ ] **Step 2: Create VariantSelect component**

Create `src/lib/components/game-setup/VariantSelect.svelte`:

```svelte
<script lang="ts">
  import { VARIANTS, VARIANT_CLASSIC } from '$lib/constants';
  import type { GameSettings } from '$lib/types';
  import { Input } from '$lib/components/ui/input/index.js';

  interface Props {
    settings: GameSettings;
  }

  let { settings = $bindable() }: Props = $props();
  let selectedVariant = $state<string>('Classic');

  function selectVariant(name: string) {
    selectedVariant = name;
    if (name !== 'Custom') {
      settings = { ...VARIANTS[name as keyof typeof VARIANTS] };
    }
  }
</script>

<div class="space-y-4">
  <div class="flex gap-2 flex-wrap">
    {#each [...Object.keys(VARIANTS), 'Custom'] as variant}
      <button
        onclick={() => selectVariant(variant)}
        class="rounded-lg px-4 py-2 text-sm font-medium transition-all
          {selectedVariant === variant
            ? 'bg-amber-500 text-emerald-950 shadow-lg shadow-amber-500/20'
            : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-700'}"
      >
        {variant}
      </button>
    {/each}
  </div>

  {#if selectedVariant === 'Custom'}
    <div class="grid grid-cols-2 gap-3 text-sm">
      <label class="space-y-1">
        <span class="text-emerald-400">Score Limit</span>
        <Input type="number" bind:value={settings.scoreLimit} class="bg-emerald-900/40 border-emerald-700" />
      </label>
      <label class="space-y-1">
        <span class="text-emerald-400">Yaniv Threshold</span>
        <Input type="number" bind:value={settings.yanivThreshold} class="bg-emerald-900/40 border-emerald-700" />
      </label>
      <label class="space-y-1">
        <span class="text-emerald-400">Assaf Penalty</span>
        <Input type="number" bind:value={settings.assafPenalty} class="bg-emerald-900/40 border-emerald-700" />
      </label>
      <label class="space-y-1">
        <span class="text-emerald-400">Table Timer (sec)</span>
        <Input type="number" bind:value={settings.tableTimerSeconds} class="bg-emerald-900/40 border-emerald-700" />
      </label>
    </div>
    <div class="flex flex-wrap gap-4 text-sm mt-3">
      <label class="flex items-center gap-2 text-emerald-300">
        <input type="checkbox" bind:checked={settings.halvingEnabled} class="accent-amber-500" />
        Halving at 50s
      </label>
      <label class="flex items-center gap-2 text-emerald-300">
        <input type="checkbox" bind:checked={settings.assafEnabled} class="accent-amber-500" />
        Assaf rule
      </label>
      <label class="flex items-center gap-2 text-emerald-300">
        <input type="checkbox" bind:checked={settings.jokersEnabled} class="accent-amber-500" />
        Jokers (0 pts)
      </label>
      <label class="flex items-center gap-2 text-emerald-300">
        <input type="checkbox" bind:checked={settings.tableTimerEnabled} class="accent-amber-500" />
        Table timer
      </label>
    </div>
  {/if}

  <div class="text-xs text-emerald-500 space-y-1">
    <p>Limit: {settings.scoreLimit} | Threshold: ≤{settings.yanivThreshold} | Assaf: +{settings.assafPenalty}</p>
  </div>
</div>
```

- [ ] **Step 3: Create new game page**

Create `src/routes/game/new/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button/index.js';
  import Header from '$lib/components/layout/Header.svelte';
  import PlayerForm from '$lib/components/game-setup/PlayerForm.svelte';
  import VariantSelect from '$lib/components/game-setup/VariantSelect.svelte';
  import { VARIANT_CLASSIC, PLAYER_COLORS, PLAYER_AVATARS } from '$lib/constants';
  import { gameStore } from '$lib/stores/game.svelte';
  import { playersStore } from '$lib/stores/players.svelte';
  import type { GameSettings, GamePlayer } from '$lib/types';

  let players = $state([
    { name: '', avatar: PLAYER_AVATARS[0], color: PLAYER_COLORS[0] },
    { name: '', avatar: PLAYER_AVATARS[1], color: PLAYER_COLORS[1] },
  ]);

  let settings = $state<GameSettings>({ ...VARIANT_CLASSIC });

  function startGame() {
    const validPlayers = players.filter(p => p.name.trim());
    if (validPlayers.length < 2) return;

    const gamePlayers: GamePlayer[] = validPlayers.map(p => {
      const known = playersStore.getOrCreate(p.name.trim(), p.avatar, p.color);
      return {
        knownPlayerId: known.id,
        name: known.name,
        avatar: known.avatar,
        color: known.color,
        eliminated: false,
      };
    });

    const gameId = gameStore.startGame(gamePlayers, settings);
    goto(`/game/${gameId}`);
  }

  const canStart = $derived(players.filter(p => p.name.trim()).length >= 2);
</script>

<Header title="New Game" showBack />

<div class="mx-auto max-w-lg px-4 py-6 space-y-8">
  <section>
    <h2 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Players</h2>
    <PlayerForm bind:players />
  </section>

  <section>
    <h2 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Variant</h2>
    <VariantSelect bind:settings />
  </section>

  <Button
    onclick={startGame}
    disabled={!canStart}
    class="w-full bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-lg py-6 shadow-lg shadow-amber-500/20 disabled:opacity-40"
  >
    Start Game
  </Button>
</div>
```

- [ ] **Step 4: Verify new game flow**

```bash
pnpm dev
```

Navigate to /game/new, add 2+ player names, select a variant, click Start Game. Should redirect to /game/[id].

- [ ] **Step 5: Commit**

```bash
git add src/routes/game/new/ src/lib/components/game-setup/
git commit -m "feat: implement new game setup with player form and variant selection"
```

---

## Task 9: Active Game — Scoreboard & Round Entry

**Files:**
- Create: `src/routes/game/[id]/+page.svelte`
- Create: `src/lib/components/scoreboard/Scoreboard.svelte`
- Create: `src/lib/components/round-entry/RoundEntryPanel.svelte`
- Create: `src/lib/components/round-entry/YanivCallerSelect.svelte`

- [ ] **Step 1: Create Scoreboard component**

Create `src/lib/components/scoreboard/Scoreboard.svelte`:

```svelte
<script lang="ts">
  import type { Game, Round } from '$lib/types';
  import { getRunningTotals } from '$lib/engine/scoring';

  interface Props {
    game: Game;
  }
  let { game }: Props = $props();

  const totals = $derived(getRunningTotals(game.rounds));

  const activePlayers = $derived(game.players.filter(p => !p.eliminated));
  const leaderId = $derived(() => {
    let minScore = Infinity;
    let leader = '';
    for (const p of activePlayers) {
      const score = totals[p.knownPlayerId] ?? 0;
      if (score < minScore) {
        minScore = score;
        leader = p.knownPlayerId;
      }
    }
    return leader;
  });
</script>

<div class="overflow-x-auto">
  <table class="w-full text-center text-sm">
    <thead>
      <tr class="border-b border-emerald-800/50">
        <th class="py-2 px-1 text-emerald-500 text-xs">Rnd</th>
        {#each game.players as player}
          <th class="py-2 px-1 min-w-[60px]">
            <div class="flex flex-col items-center gap-0.5">
              <span class="text-lg">{player.avatar}</span>
              <span class="text-xs truncate max-w-[60px] {player.eliminated ? 'line-through text-emerald-700' : 'text-emerald-300'}">
                {player.name}
              </span>
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each game.rounds as round}
        <tr class="border-b border-emerald-900/30">
          <td class="py-1.5 text-emerald-600 text-xs">{round.number}</td>
          {#each game.players as player}
            {@const pid = player.knownPlayerId}
            {@const score = round.appliedScores[pid] ?? 0}
            {@const isYanivCaller = round.yanivCallerId === pid}
            {@const isAssafer = round.assafPlayerId === pid}
            {@const wasHalved = round.halvingEvents.includes(pid)}
            {@const wasEliminated = round.eliminations.includes(pid)}
            <td class="py-1.5 font-mono text-sm
              {score === 0 ? 'text-green-400' : ''}
              {isYanivCaller && round.wasAssafed ? 'text-red-400' : ''}
              {wasEliminated ? 'text-red-500 font-bold' : ''}
              {wasHalved ? 'text-amber-400' : ''}
            ">
              {#if isYanivCaller && !round.wasAssafed}
                Y
              {:else if isAssafer}
                A
              {:else}
                {score}
              {/if}
              {#if wasHalved}½{/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr class="border-t-2 border-emerald-700">
        <td class="py-2 text-emerald-500 text-xs font-bold">Total</td>
        {#each game.players as player}
          {@const pid = player.knownPlayerId}
          {@const total = totals[pid] ?? 0}
          <td class="py-2 font-mono text-lg font-bold
            {player.eliminated ? 'text-red-500/50 line-through' : ''}
            {!player.eliminated && leaderId() === pid ? 'text-amber-400' : 'text-emerald-200'}
          ">
            {total}
          </td>
        {/each}
      </tr>
    </tfoot>
  </table>
</div>
```

- [ ] **Step 2: Create YanivCallerSelect component**

Create `src/lib/components/round-entry/YanivCallerSelect.svelte`:

```svelte
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
  <p class="text-sm text-emerald-400 font-medium">Who called Yaniv?</p>
  <div class="flex flex-wrap gap-2">
    {#each activePlayers as player}
      <button
        onclick={() => onSelect(player.knownPlayerId)}
        class="flex items-center gap-2 rounded-lg px-3 py-2 transition-all
          {selectedId === player.knownPlayerId
            ? 'bg-amber-500 text-emerald-950 shadow-lg'
            : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/60'}"
      >
        <span>{player.avatar}</span>
        <span class="text-sm">{player.name}</span>
      </button>
    {/each}
  </div>
</div>
```

- [ ] **Step 3: Create RoundEntryPanel component**

Create `src/lib/components/round-entry/RoundEntryPanel.svelte`:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import YanivCallerSelect from './YanivCallerSelect.svelte';
  import type { Game } from '$lib/types';

  interface Props {
    game: Game;
    onSubmit: (handValues: Record<string, number>, yanivCallerId: string, assafPlayerId?: string) => void;
    onCancel: () => void;
  }
  let { game, onSubmit, onCancel }: Props = $props();

  const activePlayers = $derived(game.players.filter(p => !p.eliminated));

  let yanivCallerId = $state<string | null>(null);
  let handValues = $state<Record<string, string>>({});
  let assafPlayerId = $state<string | undefined>(undefined);

  // Auto-detect potential Assaf
  const potentialAssafers = $derived(() => {
    if (!yanivCallerId || !game.settings.assafEnabled) return [];
    const callerValue = parseInt(handValues[yanivCallerId] ?? '99');
    if (isNaN(callerValue)) return [];
    return activePlayers.filter(p =>
      p.knownPlayerId !== yanivCallerId &&
      parseInt(handValues[p.knownPlayerId] ?? '99') <= callerValue
    );
  });

  function submit() {
    if (!yanivCallerId) return;
    const values: Record<string, number> = {};
    for (const player of activePlayers) {
      const val = parseInt(handValues[player.knownPlayerId] ?? '0');
      values[player.knownPlayerId] = isNaN(val) ? 0 : val;
    }
    onSubmit(values, yanivCallerId, assafPlayerId);

    // Reset
    yanivCallerId = null;
    handValues = {};
    assafPlayerId = undefined;
  }

  const canSubmit = $derived(
    yanivCallerId !== null &&
    activePlayers.every(p => handValues[p.knownPlayerId]?.trim())
  );
</script>

<div class="rounded-t-2xl bg-emerald-950 border-t border-emerald-700 p-4 space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="font-bold text-emerald-200">Round {game.rounds.length + 1}</h3>
    <Button variant="ghost" size="sm" onclick={onCancel} class="text-emerald-500">Cancel</Button>
  </div>

  <YanivCallerSelect
    players={game.players}
    selectedId={yanivCallerId}
    onSelect={(id) => { yanivCallerId = id; }}
  />

  <div class="space-y-2">
    <p class="text-sm text-emerald-400 font-medium">Hand values</p>
    {#each activePlayers as player}
      <div class="flex items-center gap-2">
        <span class="w-6 text-center">{player.avatar}</span>
        <span class="text-sm text-emerald-300 w-20 truncate">{player.name}</span>
        <Input
          type="number"
          inputmode="numeric"
          min="0"
          bind:value={handValues[player.knownPlayerId]}
          placeholder="0"
          class="flex-1 bg-emerald-900/40 border-emerald-700 text-center font-mono"
        />
      </div>
    {/each}
  </div>

  {#if potentialAssafers().length > 0}
    <div class="rounded-lg bg-red-900/20 border border-red-800/50 p-3 space-y-2">
      <p class="text-sm text-red-400 font-medium">Assaf! Who called it?</p>
      <div class="flex flex-wrap gap-2">
        {#each potentialAssafers() as player}
          <button
            onclick={() => assafPlayerId = player.knownPlayerId}
            class="rounded-lg px-3 py-1.5 text-sm transition-all
              {assafPlayerId === player.knownPlayerId
                ? 'bg-red-500 text-white'
                : 'bg-red-900/30 text-red-300 border border-red-700'}"
          >
            {player.avatar} {player.name}
          </button>
        {/each}
        <button
          onclick={() => assafPlayerId = undefined}
          class="rounded-lg px-3 py-1.5 text-sm transition-all
            {assafPlayerId === undefined
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-900/30 text-emerald-300 border border-emerald-700'}"
        >
          No Assaf
        </button>
      </div>
    </div>
  {/if}

  <Button
    onclick={submit}
    disabled={!canSubmit}
    class="w-full bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold py-4 disabled:opacity-40"
  >
    Confirm Round
  </Button>
</div>
```

- [ ] **Step 4: Create active game page**

Create `src/routes/game/[id]/+page.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import Header from '$lib/components/layout/Header.svelte';
  import Scoreboard from '$lib/components/scoreboard/Scoreboard.svelte';
  import RoundEntryPanel from '$lib/components/round-entry/RoundEntryPanel.svelte';
  import { gameStore } from '$lib/stores/game.svelte';

  let showRoundEntry = $state(false);
  let loaded = $state(false);

  onMount(() => {
    const gameId = $page.params.id;
    loaded = gameStore.loadGame(gameId);
    if (!loaded) goto('/');
  });

  function handleRoundSubmit(handValues: Record<string, number>, yanivCallerId: string, assafPlayerId?: string) {
    gameStore.addRound(handValues, yanivCallerId, assafPlayerId);
    showRoundEntry = false;

    if (gameStore.active?.status === 'completed') {
      goto(`/game/${gameStore.active.id}/results`);
    }
  }
</script>

{#if loaded && gameStore.active}
  <Header title="Game" showBack />

  <div class="mx-auto max-w-lg px-2 py-4">
    <Scoreboard game={gameStore.active} />

    <div class="mt-4 flex gap-2 px-2">
      {#if gameStore.active.status === 'in_progress'}
        <Button
          onclick={() => showRoundEntry = true}
          class="flex-1 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold py-4"
        >
          + Add Round
        </Button>
        <Button
          variant="outline"
          onclick={() => gameStore.undoLastRound()}
          disabled={gameStore.active.rounds.length === 0}
          class="border-emerald-700 text-emerald-400"
        >
          Undo
        </Button>
        <Button
          variant="outline"
          onclick={() => { if (confirm('Abandon this game?')) { gameStore.abandonGame(); goto('/'); } }}
          class="border-red-800 text-red-400"
        >
          End
        </Button>
      {/if}
    </div>
  </div>

  {#if showRoundEntry}
    <div class="fixed inset-x-0 bottom-0 z-40">
      <RoundEntryPanel
        game={gameStore.active}
        onSubmit={handleRoundSubmit}
        onCancel={() => showRoundEntry = false}
      />
    </div>
  {/if}
{/if}
```

- [ ] **Step 5: Verify full game flow**

```bash
pnpm dev
```

Test: Create game → add rounds → verify scores update → undo → add more rounds.

- [ ] **Step 6: Commit**

```bash
git add src/routes/game/ src/lib/components/scoreboard/ src/lib/components/round-entry/
git commit -m "feat: implement active game scoreboard with round entry and undo"
```

---

## Task 10: Game Over & Share

**Files:**
- Create: `src/routes/game/[id]/results/+page.svelte`
- Create: `src/lib/components/game-over/ResultsScreen.svelte`
- Create: `src/lib/components/game-over/ShareButton.svelte`

- [ ] **Step 1: Create ShareButton component**

Create `src/lib/components/game-over/ShareButton.svelte`:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import type { Game } from '$lib/types';
  import { getRunningTotals } from '$lib/engine/scoring';
  import { formatDate } from '$lib/utils';

  interface Props {
    game: Game;
  }
  let { game }: Props = $props();
  let copied = $state(false);

  function generateShareText(): string {
    const totals = getRunningTotals(game.rounds);
    const ranked = [...game.players].sort((a, b) => {
      if (a.eliminated && !b.eliminated) return 1;
      if (!a.eliminated && b.eliminated) return -1;
      return (totals[a.knownPlayerId] ?? 0) - (totals[b.knownPlayerId] ?? 0);
    });

    const lines = [
      `Yaniv Game Results`,
      `${formatDate(game.createdAt)} | ${game.settings.variantName} (${game.settings.scoreLimit}/${game.settings.yanivThreshold}/${game.settings.assafPenalty})`,
      ``,
    ];

    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    ranked.forEach((p, i) => {
      const pid = p.knownPlayerId;
      const total = totals[pid] ?? 0;
      if (p.eliminated) {
        lines.push(`${ordinals[i]}  ${p.avatar} ${p.name.padEnd(12)} OUT (round ${p.eliminatedAtRound})`);
      } else {
        lines.push(`${ordinals[i]}  ${p.avatar} ${p.name.padEnd(12)} ${total}/${game.settings.scoreLimit}`);
      }
    });

    // Highlights
    const highlights: string[] = [];
    for (const round of game.rounds) {
      if (round.wasAssafed) {
        const caller = game.players.find(p => p.knownPlayerId === round.yanivCallerId);
        const assafer = game.players.find(p => p.knownPlayerId === round.assafPlayerId);
        if (caller && assafer) {
          highlights.push(`${assafer.name} Assaf'd ${caller.name} in round ${round.number}`);
        }
      }
      for (const pid of round.halvingEvents) {
        const player = game.players.find(p => p.knownPlayerId === pid);
        if (player) {
          highlights.push(`${player.name} halved in round ${round.number}`);
        }
      }
    }

    lines.push('');
    if (highlights.length > 0) {
      lines.push('Highlights:');
      highlights.forEach(h => lines.push(`- ${h}`));
    }
    lines.push(`${game.rounds.length} rounds played`);
    return lines.join('\n');
  }

  async function share() {
    const text = generateShareText();
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => copied = false, 2000);
    }
  }
</script>

<Button onclick={share} variant="outline" class="border-emerald-600 text-emerald-300">
  {copied ? 'Copied!' : 'Share Results'}
</Button>
```

- [ ] **Step 2: Create ResultsScreen component**

Create `src/lib/components/game-over/ResultsScreen.svelte`:

```svelte
<script lang="ts">
  import type { Game } from '$lib/types';
  import { getRunningTotals } from '$lib/engine/scoring';
  import ShareButton from './ShareButton.svelte';

  interface Props {
    game: Game;
  }
  let { game }: Props = $props();

  const totals = $derived(getRunningTotals(game.rounds));
  const ranked = $derived(
    [...game.players].sort((a, b) => {
      if (a.eliminated && !b.eliminated) return 1;
      if (!a.eliminated && b.eliminated) return -1;
      return (totals[a.knownPlayerId] ?? 0) - (totals[b.knownPlayerId] ?? 0);
    })
  );

  const winner = $derived(game.players.find(p => p.knownPlayerId === game.winnerId));
</script>

<div class="text-center space-y-6">
  {#if winner}
    <div>
      <p class="text-6xl mb-2">{winner.avatar}</p>
      <h2 class="text-2xl font-bold text-amber-400">{winner.name} Wins!</h2>
      <p class="text-emerald-400 text-sm">{game.rounds.length} rounds played</p>
    </div>
  {/if}

  <div class="space-y-2">
    {#each ranked as player, i}
      {@const total = totals[player.knownPlayerId] ?? 0}
      <div class="flex items-center gap-3 rounded-lg px-4 py-3
        {i === 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-emerald-900/30 border border-emerald-800/30'}">
        <span class="text-lg font-bold text-emerald-500 w-6">{i + 1}</span>
        <span class="text-xl">{player.avatar}</span>
        <span class="flex-1 text-left {player.eliminated ? 'line-through text-emerald-600' : 'text-emerald-200'}">
          {player.name}
        </span>
        <span class="font-mono text-lg {player.eliminated ? 'text-red-500/60' : 'text-emerald-200'}">
          {player.eliminated ? 'OUT' : `${total}/${game.settings.scoreLimit}`}
        </span>
      </div>
    {/each}
  </div>

  <!-- Notable moments -->
  {#if game.rounds.some(r => r.wasAssafed || r.halvingEvents.length > 0)}
    <div class="rounded-lg bg-emerald-900/20 border border-emerald-800/30 p-4 text-left space-y-1">
      <h3 class="text-sm font-semibold text-emerald-400 mb-2">Highlights</h3>
      {#each game.rounds as round}
        {#if round.wasAssafed}
          {@const caller = game.players.find(p => p.knownPlayerId === round.yanivCallerId)}
          {@const assafer = game.players.find(p => p.knownPlayerId === round.assafPlayerId)}
          <p class="text-xs text-red-400">Round {round.number}: {assafer?.name} Assaf'd {caller?.name}!</p>
        {/if}
        {#each round.halvingEvents as pid}
          {@const player = game.players.find(p => p.knownPlayerId === pid)}
          <p class="text-xs text-amber-400">Round {round.number}: {player?.name}'s score halved!</p>
        {/each}
      {/each}
    </div>
  {/if}

  <div class="flex gap-3 justify-center">
    <ShareButton {game} />
    <a href="/" class="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-amber-400">
      New Game
    </a>
  </div>
</div>
```

- [ ] **Step 3: Create results page**

Create `src/routes/game/[id]/results/+page.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import ResultsScreen from '$lib/components/game-over/ResultsScreen.svelte';
  import { gameStore } from '$lib/stores/game.svelte';

  let loaded = $state(false);

  onMount(() => {
    loaded = gameStore.loadGame($page.params.id);
    if (!loaded) goto('/');
  });
</script>

{#if loaded && gameStore.active}
  <Header title="Game Over" />

  <div class="mx-auto max-w-lg px-4 py-8">
    <ResultsScreen game={gameStore.active} />
  </div>
{/if}
```

- [ ] **Step 4: Verify game over flow**

Test: Play a game to completion (eliminate all but one player) → verify redirect to results → verify share works.

- [ ] **Step 5: Commit**

```bash
git add src/routes/game/*/results/ src/lib/components/game-over/
git commit -m "feat: implement game over results screen with share functionality"
```

---

## Task 11: Rules Page

**Files:**
- Create: `src/routes/rules/+page.svelte`
- Create: `src/lib/components/rules/RulesAccordion.svelte`

- [ ] **Step 1: Create rules content**

Create `src/lib/components/rules/RulesAccordion.svelte` with all rules sections using shadcn-svelte Accordion component. Content should cover: Overview, Setup, Card Values, Turn Actions, Calling Yaniv, Assaf, Scoring & Halving, Winning, Variants.

Each section should be a collapsible accordion item with clear, concise text. The card values section should reference the Card Reference page for visual details.

- [ ] **Step 2: Create rules page**

Create `src/routes/rules/+page.svelte`:

```svelte
<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import RulesAccordion from '$lib/components/rules/RulesAccordion.svelte';
</script>

<Header title="Rules" showBack />

<div class="mx-auto max-w-lg px-4 py-6">
  <RulesAccordion />
</div>
```

- [ ] **Step 3: Verify rules page**

Navigate to /rules, verify all sections expand/collapse correctly.

- [ ] **Step 4: Commit**

```bash
git add src/routes/rules/ src/lib/components/rules/
git commit -m "feat: implement rules page with collapsible accordion sections"
```

---

## Task 12: Game History Page

**Files:**
- Create: `src/routes/history/+page.svelte`

- [ ] **Step 1: Implement history page**

Create `src/routes/history/+page.svelte`:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import Header from '$lib/components/layout/Header.svelte';
  import { storage } from '$lib/stores/storage.svelte';
  import { formatDateTime } from '$lib/utils';
  import { getRunningTotals } from '$lib/engine/scoring';
  import type { Game } from '$lib/types';

  let statusFilter = $state<string>('all');
  let playerFilter = $state('');
  let expandedGameId = $state<string | null>(null);

  function duration(game: Game): string {
    if (!game.completedAt) return 'ongoing';
    const ms = new Date(game.completedAt).getTime() - new Date(game.createdAt).getTime();
    const mins = Math.round(ms / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  const filteredGames = $derived(
    [...storage.games]
      .filter(g => statusFilter === 'all' || g.status === statusFilter)
      .filter(g => !playerFilter || g.players.some(p =>
        p.name.toLowerCase().includes(playerFilter.toLowerCase())
      ))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
</script>

<Header title="History" showBack />

<div class="mx-auto max-w-lg px-4 py-6 space-y-4">
  <!-- Filters -->
  <div class="flex gap-2 items-center">
    <select bind:value={statusFilter}
      class="rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-300 text-sm px-3 py-1.5">
      <option value="all">All</option>
      <option value="completed">Completed</option>
      <option value="in_progress">In Progress</option>
      <option value="abandoned">Abandoned</option>
    </select>
    <Input
      bind:value={playerFilter}
      placeholder="Filter by player..."
      class="flex-1 bg-emerald-900/40 border-emerald-700 text-sm"
    />
  </div>

  {#if filteredGames.length === 0}
    <p class="text-center text-emerald-600 py-12">No games found.</p>
  {:else}
    {#each filteredGames as game}
      {@const totals = getRunningTotals(game.rounds)}
      {@const winner = game.players.find(p => p.knownPlayerId === game.winnerId)}
      {@const expanded = expandedGameId === game.id}
      <div class="rounded-lg bg-emerald-900/30 border border-emerald-800/40 overflow-hidden">
        <button
          onclick={() => expandedGameId = expanded ? null : game.id}
          class="w-full p-4 text-left hover:bg-emerald-900/50 transition-colors"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-emerald-500">{formatDateTime(game.createdAt)}</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-emerald-600">{duration(game)}</span>
              <span class="text-xs px-2 py-0.5 rounded-full
                {game.status === 'completed' ? 'bg-green-900/30 text-green-400' : ''}
                {game.status === 'in_progress' ? 'bg-amber-900/30 text-amber-400' : ''}
                {game.status === 'abandoned' ? 'bg-red-900/30 text-red-400' : ''}
              ">
                {game.status === 'in_progress' ? 'In Progress' : game.status}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-emerald-200">{game.players.map(p => p.avatar).join(' ')}</span>
            {#if winner}
              <span class="text-amber-400">Winner: {winner.name}</span>
            {/if}
            <span class="text-emerald-600 ml-auto">{game.rounds.length} rounds</span>
          </div>
        </button>

        {#if expanded}
          <div class="border-t border-emerald-800/40 p-4 space-y-3">
            <!-- Round-by-round breakdown -->
            <div class="overflow-x-auto text-xs">
              <table class="w-full text-center">
                <thead>
                  <tr class="text-emerald-500">
                    <th class="py-1">Rnd</th>
                    {#each game.players as p}
                      <th class="py-1">{p.avatar}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each game.rounds as round}
                    <tr class="border-t border-emerald-900/30">
                      <td class="py-1 text-emerald-600">{round.number}</td>
                      {#each game.players as p}
                        <td class="py-1 font-mono {round.appliedScores[p.knownPlayerId] === 0 ? 'text-green-400' : 'text-emerald-300'}">
                          {round.appliedScores[p.knownPlayerId] ?? '-'}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <div class="flex gap-2 justify-end">
              {#if game.status === 'in_progress'}
                <a href="/game/{game.id}" class="text-xs text-amber-400 hover:underline">Resume</a>
              {/if}
              <button
                onclick={() => { if (confirm('Delete this game?')) storage.deleteGame(game.id); }}
                class="text-xs text-red-400 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/each}

    <Button
      variant="outline"
      onclick={() => { if (confirm('Delete all game history?')) storage.clearAllGames(); }}
      class="w-full border-red-800 text-red-400 hover:bg-red-900/20 mt-6"
    >
      Clear All History
    </Button>
  {/if}
</div>
```

- [ ] **Step 2: Verify history page**

Play a game or two, navigate to /history, verify games appear with correct status.

- [ ] **Step 3: Commit**

```bash
git add src/routes/history/
git commit -m "feat: implement game history page with status and navigation"
```

---

## Task 13: Player Statistics Page

**Files:**
- Create: `src/routes/stats/+page.svelte`
- Create: `src/lib/components/stats/Leaderboard.svelte`
- Create: `src/lib/components/stats/PlayerDetail.svelte`

- [ ] **Step 1: Create Leaderboard component**

Create `src/lib/components/stats/Leaderboard.svelte` showing ranked players by win rate, with avatars, games played, wins, and win rate percentage. Minimum 2 games threshold to appear.

- [ ] **Step 2: Create PlayerDetail component**

Create `src/lib/components/stats/PlayerDetail.svelte` showing all per-player stats: games, wins, win rate, avg score, yaniv calls, successful %, times assaf'd, times performed assaf, halving events, best comeback.

- [ ] **Step 3: Create stats page**

Create `src/routes/stats/+page.svelte` that computes stats from storage using `derivePlayerStats` and `deriveGlobalStats`, displays the leaderboard and global stats summary, with tap-to-expand player detail.

- [ ] **Step 4: Verify stats page**

Play several games, verify stats aggregate correctly.

- [ ] **Step 5: Commit**

```bash
git add src/routes/stats/ src/lib/components/stats/
git commit -m "feat: implement player statistics page with leaderboard and per-player detail"
```

---

## Task 14: Card Reference Page

**Files:**
- Create: `src/routes/cards/+page.svelte`
- Create: `src/lib/components/cards/CardReference.svelte`

- [ ] **Step 1: Create CardReference component**

Create `src/lib/components/cards/CardReference.svelte` showing:
- All cards grouped by suit with their point values
- Jokers (0 pts) prominently displayed
- Valid discard combos: singles, pairs, triples, runs of 3+ same suit
- Styled as card-like elements matching the Balatro theme

- [ ] **Step 2: Create cards page**

```svelte
<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import CardReference from '$lib/components/cards/CardReference.svelte';
</script>

<Header title="Card Values" showBack />

<div class="mx-auto max-w-lg px-4 py-6">
  <CardReference />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/cards/ src/lib/components/cards/
git commit -m "feat: implement card reference page with values and valid combos"
```

---

## Task 15: Settings Page

**Files:**
- Create: `src/routes/settings/+page.svelte`

- [ ] **Step 1: Implement settings page**

Create `src/routes/settings/+page.svelte` with:
- Default game settings (variant, limits, rules)
- Sound on/off + volume slider
- Theme toggle (dark default)
- Clear all data button with confirmation
- All changes save immediately via `settingsStore`

- [ ] **Step 2: Commit**

```bash
git add src/routes/settings/
git commit -m "feat: implement settings page with defaults, sound, and theme controls"
```

---

## Task 16: Sound Effects

**Files:**
- Create: `src/lib/stores/audio.svelte.ts`
- Create: `src/static/sounds/` (placeholder files)

- [ ] **Step 1: Create audio store**

Create `src/lib/stores/audio.svelte.ts` using Howler.js:

```typescript
import { Howl } from 'howler';
import { settingsStore } from './settings.svelte';

const sounds: Record<string, Howl> = {};

function getSound(name: string): Howl {
  if (!sounds[name]) {
    sounds[name] = new Howl({
      src: [`/sounds/${name}.mp3`, `/sounds/${name}.wav`],
      volume: settingsStore.current.soundVolume,
    });
  }
  return sounds[name];
}

export const audio = {
  play(name: 'yaniv' | 'assaf' | 'halving' | 'elimination' | 'win') {
    if (!settingsStore.current.soundEnabled) return;
    const sound = getSound(name);
    sound.volume(settingsStore.current.soundVolume);
    sound.play();
  },
};
```

- [ ] **Step 2: Source or generate placeholder sound files**

Add short sound effect files to `static/sounds/` (SvelteKit's static directory is at the project root, NOT under `src/`). These can be simple royalty-free effects or synthesized with Web Audio API. Files needed: `yaniv.mp3`, `assaf.mp3`, `halving.mp3`, `elimination.mp3`, `win.mp3`.

- [ ] **Step 3: Wire audio into game flow**

Add `audio.play('yaniv')`, `audio.play('assaf')`, etc. calls into `gameStore.addRound()` or the round entry component's submit handler based on round outcome.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/audio.svelte.ts static/sounds/
git commit -m "feat: add sound effects for yaniv, assaf, halving, elimination, and win events"
```

---

## Task 17: Table Timer

**Files:**
- Create: `src/lib/components/timer/TableTimer.svelte`

- [ ] **Step 1: Implement TableTimer component**

Create `src/lib/components/timer/TableTimer.svelte`:
- Circular countdown timer display
- Start/pause/reset controls
- Plays a sound alert when time expires
- Advisory only — no game state impact
- Configurable duration from game settings

- [ ] **Step 2: Wire into active game page**

Add TableTimer to the active game page (`/game/[id]`), shown only when `settings.tableTimerEnabled` is true.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/timer/
git commit -m "feat: add advisory table timer with countdown and alert"
```

---

## Task 18: PWA & Deployment

**Files:**
- Create: `static/favicon.svg`
- Verify: `vite.config.ts` PWA config
- Create: `wrangler.toml` (optional, for Cloudflare config)

- [ ] **Step 1: Create app icon**

Create a simple SVG favicon — a playing card or "Y" in the Balatro color scheme.

- [ ] **Step 2: Verify PWA manifest**

```bash
pnpm build
```

Check that the build output includes the manifest and service worker.

- [ ] **Step 3: Test static build locally**

```bash
pnpm build && pnpm preview
```

Verify the app works as a static SPA — all routes resolve, localStorage persists.

- [ ] **Step 4: Deploy to Cloudflare Pages**

```bash
npx wrangler pages project create yaniv
npx wrangler pages deploy build
```

The `adapter-static` outputs to `build/` by default. Cloudflare Pages serves static files directly.

Or set up GitHub integration for auto-deploys.

- [ ] **Step 5: Configure custom domain**

In Cloudflare dashboard: Pages → yaniv → Custom domains → Add domain.

- [ ] **Step 6: Commit deployment config**

```bash
git add static/favicon.svg wrangler.toml
git commit -m "feat: add PWA icon and Cloudflare Pages deployment config"
```

---

## Task 19: Final Polish & README

**Files:**
- Modify: Various components for animation polish
- Create/Modify: `README.md`

- [ ] **Step 1: Add light theme CSS variables**

Add to `src/app.css` a `[data-theme="light"]` block with inverted variables: light background, dark text, muted greens. Wire theme switching via `settingsStore.current.theme` — apply `data-theme` attribute to `<html>` element in `+layout.svelte`.

- [ ] **Step 2: Add hover/tap animations**

Add subtle CSS transitions to card-like elements: hover tilt, press scale, score flash on update.

- [ ] **Step 3: Add halving celebration animation**

When a halving event occurs, briefly flash the score in amber with a scale-up animation.

- [ ] **Step 4: Add winner celebration animation**

On the ResultsScreen, animate the winner's avatar with a bounce/scale-up + particle-like confetti effect using CSS keyframes. Keep it lightweight — no library needed.

- [ ] **Step 5: Add animated hero to home page**

Add a simple card-flip or card-fan animation to the home page title area using CSS keyframes. A stack of 3-4 card-like shapes that fan out on load.

- [ ] **Step 6: Write README**

Document: what the app does, how to run locally, how to deploy, tech stack, screenshots.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: add animations, polish, and README documentation"
```
