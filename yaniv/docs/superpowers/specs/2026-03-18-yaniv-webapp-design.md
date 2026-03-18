# Yaniv Score Tracker — Design Spec

**Date:** 2026-03-18
**Status:** Draft
**Author:** Cliff + Claude

## Purpose

A mobile-first webapp for tracking scores in the card game Yaniv. The app replaces pen-and-paper scoring with automatic calculation of running totals, halving events, eliminations, and Assaf penalties. Secondary features include rules reference, game history, player statistics, card reference, shareable results, and configurable rule variants.

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | SvelteKit (Svelte 5) | File-based routing, SSG support, reactive stores |
| Components | shadcn-svelte | Copy-into-project model allows deep Balatro-themed customization |
| Styling | Tailwind CSS v4 | Utility-first, pairs with shadcn-svelte |
| State | Svelte stores + localStorage | Reactive, persistent, no backend |
| PWA | Vite PWA plugin / basic manifest | Add-to-home-screen on mobile |
| Deploy | Cloudflare Pages (custom domain) | Free tier, global CDN, SvelteKit adapter available |
| Audio | Howler.js or Web Audio API | Sound effects for Yaniv calls, Assaf, halvings |

## Visual Direction: Balatro-Inspired

The app borrows the *mood* of Balatro — not a pixel-perfect recreation, but the same retro-casino atmosphere:

- **Dark casino-green background** with subtle noise texture overlay
- **CRT effects** — faint scanline overlay, slight vignette at screen edges (CSS only)
- **Saturated neon accents** — reds, blues, golds for scores, highlights, and alerts
- **Chunky retro typography** — bold, slightly playful headings; clean body text
- **Card-like UI panels** — rounded corners, layered shadows, slight hover tilt animations
- **Player avatars** — emoji or simple icon avatars with distinct colors per player
- **Sound effects** — satisfying audio feedback for key moments (Yaniv call, Assaf, halving, elimination, game over)

Mobile-first: designed for phone screens passed around a table.

## Pages & Routes

### 1. Home (`/`)

- Prominent "New Game" button
- Resume in-progress game (if exists)
- Quick links: Rules, History, Stats, Card Reference
- Animated card-themed hero/splash element

### 2. New Game Setup (`/game/new`)

- Add 2-6 player names
- Assign avatar (emoji picker or preset list) and color per player
- Select rule variant preset OR customize individually:

| Setting | Options | Default |
|---------|---------|---------|
| Score limit | 100 / 200 / 300 / custom | 200 |
| Yaniv threshold | 5 / 7 / custom | 7 |
| Assaf penalty | 25 / 30 / 35 / custom | 30 |
| Halving rule | on / off | on |
| Halving multiple | 50 (fixed) | 50 |
| Assaf rule | on / off | on |
| Turn timer | off / 30s / 60s / 90s / custom | off |
| Jokers in deck | on / off | on |

- Preset variants:
  - **Classic** — 200 / 7 / 30 / halving on / Assaf on
  - **Quick** — 100 / 5 / 25 / halving on / Assaf on
  - **Marathon** — 300 / 7 / 30 / halving on / Assaf on
  - **Custom** — all fields editable

### 3. Active Game (`/game/:id`)

The core of the app. Two main areas:

**Scoreboard (always visible):**
- Player names + avatars across the top
- Large running totals per player
- Round-by-round history in a scrollable table below
- Eliminated players visually greyed out with strikethrough
- Halving events highlighted with animation (e.g. score flash, particle effect)
- Current leader indicated

**Round Entry (slide-up panel or modal):**
1. Who called Yaniv? (tap a player avatar)
2. Enter each non-eliminated player's hand value (number-pad-style input for speed)
3. System auto-detects Assaf: if any other player's hand value <= caller's, prompt to confirm Assaf (select which player Assaf'd)
4. Confirm round → scores calculated and added
5. Sound effect plays for: successful Yaniv, Assaf, halving, elimination

**Controls:**
- Undo last round
- End game early (mark as abandoned)
- View/change game settings mid-game (non-destructive settings only)
- Optional turn timer with visual countdown

### 4. Game Over (`/game/:id/results`)

- Final standings (1st, 2nd, 3rd, etc.)
- Winner celebration animation
- Round-by-round recap
- Notable moments: Assaf events, halvings, closest calls
- Share button: generates text summary or screenshot via Web Share API / clipboard

### 5. Rules (`/rules`)

Collapsible accordion sections:
1. **Overview & Objective** — minimize hand value, call Yaniv
2. **Setup & Deal** — deck composition (including Jokers), dealing
3. **Card Values** — number cards = face value, face cards = 10, Aces = 1, Jokers = 0
4. **Turn Actions** — discard (singles, pairs, triples, runs of 3+) then draw (deck or top of discard)
5. **Calling Yaniv** — when hand value <= threshold
6. **Assaf** — another player has equal or lower hand → caller penalized
7. **Scoring & Halving** — round scoring, running totals, halving at multiples of 50
8. **Winning** — last player under the score limit
9. **Variant Rules** — explanation of each configurable option

### 6. Game History (`/history`)

- Chronological list of completed and abandoned games
- Each entry: date, player names, winner, number of rounds, duration
- Tap to expand: full round-by-round breakdown
- Delete individual games or clear all
- Filter by: status (completed/abandoned), player name

### 7. Player Statistics (`/stats`)

Aggregated from all games in localStorage:

- **Leaderboard** — ranked by win rate (minimum games threshold)
- **Per-player detail:**
  - Games played, wins, win rate
  - Average final score
  - Yaniv calls: total, successful, Assaf'd (with percentages)
  - Times they Assaf'd someone else
  - Halving events received
  - Best comeback (largest score recovered via halving)
- **Global stats:**
  - Total games played
  - Total rounds played
  - Most common winner
  - Longest game (by rounds)

### 8. Card Reference (`/cards`)

- Visual display of all cards with their point values
- Jokers (0 points) prominently shown
- Valid discard combinations: singles, pairs, triples, runs of 3+ in same suit
- Quick-reference cheat sheet for new players

### 9. Settings (`/settings`)

- Default game configuration (pre-fills New Game setup)
- Theme: dark (default), option for light mode
- Sound effects: on/off, volume
- Timer defaults
- Clear all game data (with confirmation)

## Data Model

```typescript
interface Game {
  id: string;
  players: Player[];
  rounds: Round[];
  settings: GameSettings;
  status: 'in_progress' | 'completed' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  winnerId?: string;
}

interface Player {
  id: string;
  name: string;
  avatar: string;        // emoji or icon identifier
  color: string;         // hex color for charts/highlights
  eliminated: boolean;
  eliminatedAtRound?: number;
}

interface Round {
  number: number;
  scores: Record<string, number>;  // playerId -> hand value that round
  yanivCallerId: string;
  assafPlayerId?: string;          // who performed the Assaf
  wasAssafed: boolean;
  halvingEvents: string[];         // playerIds whose totals halved this round
  eliminations: string[];          // playerIds eliminated this round
  timestamp: string;
}

interface GameSettings {
  scoreLimit: number;
  yanivThreshold: number;
  halvingEnabled: boolean;
  halvingMultiple: number;
  assafEnabled: boolean;
  assafPenalty: number;
  timerEnabled: boolean;
  timerSeconds: number;
  jokersEnabled: boolean;
  variantName: string;
}

interface PlayerStats {
  playerId: string;
  name: string;
  avatar: string;
  gamesPlayed: number;
  wins: number;
  yanivCalls: number;
  successfulYanivs: number;
  timesAssafed: number;
  timesPerformedAssaf: number;
  totalFinalScore: number;
  halvingEvents: number;
  bestComeback: number;          // largest single halving benefit
}
```

## Score Calculation Rules

1. **Successful Yaniv:** Caller's hand <= threshold, no other player has equal or lower.
   - Caller gets **0** for the round
   - All others get their hand value added to running total

2. **Assaf:** Caller's hand <= threshold, but another player has equal or lower.
   - Caller gets **hand value + assaf penalty** (default 30)
   - Assaf-er gets **0** for the round
   - All others get their hand value added to running total

3. **Halving:** After adding round scores, if a player's running total lands exactly on a multiple of 50 (50, 100, 150, 200...), their total halves.

4. **Elimination:** After halving check, if a player's running total exceeds the score limit, they are eliminated from future rounds.

5. **Game Over:** When only one player remains (not eliminated), they win.

## Share Format

Text-based shareable result (copy to clipboard / Web Share API):

```
Yaniv Game Results
2026-03-18 | Classic (200/7/30)

1st  Alice    87 pts
2nd  Bob     134 pts
3rd  Charlie  OUT (round 8)
4th  Dave     OUT (round 5)

Highlights:
- Alice halved at round 6 (100 -> 50)
- Bob Assaf'd Dave in round 4
- 12 rounds played
```

## Non-Goals (v1)

- No backend / user accounts / cross-device sync
- No real-time multiplayer (one device per game)
- No actual card gameplay (this is a score tracker, not a game simulator)
- No internationalization (English only for v1)
