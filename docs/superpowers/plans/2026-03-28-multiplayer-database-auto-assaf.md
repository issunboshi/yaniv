# Multiplayer, Database & Auto-Assaf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Yaniv score tracker from a client-only localStorage SPA into a server-backed multiplayer app with PostgreSQL, real-time game sharing via SSE, and an optional auto-assaf rule.

**Architecture:** SvelteKit with adapter-node serves both the frontend and API routes (`+server.ts`). PostgreSQL (Fly Postgres) stores all game data. The existing pure scoring engine runs server-side. Spectators connect via SSE for real-time updates. Game codes (6-char alphanumeric) replace UUIDs in URLs.

**Tech Stack:** SvelteKit 2 / Svelte 5, adapter-node, postgres.js (database driver), SSE (Server-Sent Events), Fly.io + Fly Postgres, Vitest

**Spec:** `docs/superpowers/specs/2026-03-28-multiplayer-database-auto-assaf-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `migrations/001_initial_schema.sql` | Database schema — all 6 tables |
| `migrations/run.ts` | Simple migration runner script |
| `src/lib/server/db.ts` | postgres.js pool, typed helpers |
| `src/lib/server/game-code.ts` | 6-char alphanumeric code generation |
| `src/lib/server/sse.ts` | SSE connection manager — per-game broadcast |
| `src/lib/server/queries/players.ts` | Player CRUD queries |
| `src/lib/server/queries/games.ts` | Game CRUD + full state loading |
| `src/lib/server/queries/rounds.ts` | Round add/edit/undo with scoring logic |
| `src/lib/server/queries/spectators.ts` | Spectator join/leave/list |
| `src/routes/api/players/+server.ts` | GET/POST players |
| `src/routes/api/games/+server.ts` | GET/POST games |
| `src/routes/api/games/[code]/+server.ts` | GET/PATCH/DELETE game by code |
| `src/routes/api/games/[code]/rounds/+server.ts` | POST add round |
| `src/routes/api/games/[code]/rounds/[num]/+server.ts` | PUT edit round |
| `src/routes/api/games/[code]/rounds/last/+server.ts` | DELETE undo last round |
| `src/routes/api/games/[code]/join/+server.ts` | POST join as spectator |
| `src/routes/api/games/[code]/spectators/me/+server.ts` | DELETE leave game |
| `src/routes/api/games/[code]/stream/+server.ts` | GET SSE stream |
| `src/lib/stores/api.ts` | Typed fetch wrapper for all API calls |
| `src/routes/join/+page.svelte` | Enter game code page |
| `src/routes/join/[code]/+page.svelte` | Direct join — pick player identity |
| `src/lib/components/game/GameCodeDisplay.svelte` | Game code + copy/share buttons |
| `src/lib/components/game/SpectatorBadge.svelte` | View-only indicator for spectators |
| `src/lib/components/game/SpectatorList.svelte` | Connected spectators list |

### Modified files
| File | What changes |
|------|-------------|
| `src/lib/engine/scoring.ts` | `assafPlayerId` → `assafPlayerIds: string[]` |
| `src/lib/engine/scoring.test.ts` | Tests for multiple assafers |
| `src/lib/types.ts` | Add `auto_assaf`, game code, spectator types; update Round type |
| `src/lib/constants.ts` | Add `auto_assaf` to variants |
| `src/lib/stores/game.svelte.ts` | Full rewrite: API calls + SSE instead of localStorage |
| `src/lib/stores/players.svelte.ts` | Rewrite: API calls instead of localStorage |
| `src/lib/stores/settings.svelte.ts` | Rewrite: local-only settings (sound/theme), no server |
| `src/lib/engine/stats.ts` | Accept pre-computed stats from API instead of deriving from localStorage |
| `src/routes/+layout.ts` | Remove `ssr = false` — enable SSR |
| `src/routes/+page.svelte` | Add "Join Game" option, use API for game list |
| `src/routes/game/new/+page.svelte` | Use API to create game, show game code |
| `src/routes/game/[id]/+page.svelte` | Rename to `[code]`, use API + SSE, spectator mode |
| `src/routes/game/[id]/results/+page.svelte` | Rename to `[code]`, use API |
| `src/lib/components/round-entry/RoundEntryPanel.svelte` | Hide assaf picker when auto_assaf is on |
| `svelte.config.js` | adapter-static → adapter-node |
| `Dockerfile` | Node server instead of nginx |
| `fly.toml` | Add DATABASE_URL reference |
| `package.json` | Add postgres, adapter-node; remove adapter-static |

### Deleted files
| File | Reason |
|------|--------|
| `src/lib/stores/storage.svelte.ts` | No more localStorage |
| `nginx.conf` | No more nginx — node serves directly |

---

## Task 1: Infrastructure — Adapter Switch & Dependencies

**Files:**
- Modify: `package.json`
- Modify: `svelte.config.js`
- Modify: `src/routes/+layout.ts`

- [ ] **Step 1: Install adapter-node and postgres.js, remove adapter-static**

```bash
cd /Users/cliffwilliams/code/yaniv
pnpm remove @sveltejs/adapter-static
pnpm add -D @sveltejs/adapter-node
pnpm add postgres
```

- [ ] **Step 2: Switch svelte.config.js to adapter-node**

Replace `svelte.config.js` with:

```javascript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    serviceWorker: {
      register: false
    }
  }
};

export default config;
```

- [ ] **Step 3: Update layout.ts — remove ssr=false**

Replace `src/routes/+layout.ts` with:

```typescript
export const ssr = false; // Keep client-only for now, enable SSR later if needed
```

Note: We keep `ssr = false` for now since the frontend still uses browser APIs. This can be enabled per-route later.

- [ ] **Step 4: Verify the app still builds**

```bash
cd /Users/cliffwilliams/code/yaniv
pnpm build
```

Expected: Build succeeds with adapter-node. Output goes to `build/` as a Node server.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml svelte.config.js src/routes/+layout.ts
git commit -m "chore: switch from adapter-static to adapter-node, add postgres.js"
```

---

## Task 2: Database Schema Migration

**Files:**
- Create: `migrations/001_initial_schema.sql`
- Create: `migrations/run.ts`

- [ ] **Step 1: Create the SQL migration**

Create `migrations/001_initial_schema.sql`:

```sql
-- Yaniv Score Tracker — Initial Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '🃏',
  color text NOT NULL DEFAULT '#e74c3c',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT players_name_unique UNIQUE (lower(name))
);

CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  variant_name text NOT NULL DEFAULT 'Classic',
  score_limit int NOT NULL DEFAULT 200,
  yaniv_threshold int NOT NULL DEFAULT 5,
  halving_enabled bool NOT NULL DEFAULT true,
  halving_multiple int NOT NULL DEFAULT 50,
  assaf_enabled bool NOT NULL DEFAULT true,
  assaf_penalty int NOT NULL DEFAULT 30,
  auto_assaf bool NOT NULL DEFAULT false,
  jokers_enabled bool NOT NULL DEFAULT true,
  timer_enabled bool NOT NULL DEFAULT false,
  timer_seconds int NOT NULL DEFAULT 60,
  created_by uuid NOT NULL REFERENCES players(id),
  winner_id uuid REFERENCES players(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id),
  display_order int NOT NULL,
  eliminated bool NOT NULL DEFAULT false,
  eliminated_at_round int,
  CONSTRAINT game_players_unique UNIQUE (game_id, player_id)
);

CREATE TABLE rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  yaniv_caller_id uuid NOT NULL REFERENCES players(id),
  was_assafed bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rounds_unique UNIQUE (game_id, round_number)
);

CREATE TABLE round_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id),
  hand_value int NOT NULL,
  applied_score int NOT NULL,
  was_assafer bool NOT NULL DEFAULT false,
  was_halved bool NOT NULL DEFAULT false,
  was_eliminated bool NOT NULL DEFAULT false,
  CONSTRAINT round_scores_unique UNIQUE (round_id, player_id)
);

CREATE TABLE game_spectators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id),
  connected_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_games_code ON games(code);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_rounds_game ON rounds(game_id);
CREATE INDEX idx_round_scores_round ON round_scores(round_id);
CREATE INDEX idx_game_spectators_game ON game_spectators(game_id);
```

- [ ] **Step 2: Create the migration runner**

Create `migrations/run.ts`:

```typescript
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function run() {
  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  // Read migration files
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.dirname(new URL(import.meta.url).pathname);
  const files = fs.readdirSync(dir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const [applied] = await sql`SELECT name FROM _migrations WHERE name = ${file}`;
    if (applied) {
      console.log(`  skip: ${file} (already applied)`);
      continue;
    }

    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    console.log(`  apply: ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
  }

  console.log('Migrations complete.');
  await sql.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Add migration script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"migrate": "tsx migrations/run.ts"
```

And add tsx as a dev dependency:

```bash
cd /Users/cliffwilliams/code/yaniv
pnpm add -D tsx
```

- [ ] **Step 4: Commit**

```bash
git add migrations/ package.json pnpm-lock.yaml
git commit -m "feat: add database schema migration and runner"
```

---

## Task 3: Scoring Engine — Multiple Assafers (TDD)

**Files:**
- Modify: `src/lib/engine/scoring.ts`
- Modify: `src/lib/engine/scoring.test.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write failing tests for multiple assafers**

Add these tests to `src/lib/engine/scoring.test.ts`:

```typescript
describe('calculateRoundScores with multiple assafers', () => {
  const settings: GameSettings = {
    scoreLimit: 200, yanivThreshold: 5, halvingEnabled: true, halvingMultiple: 50,
    assafEnabled: true, assafPenalty: 30, tableTimerEnabled: false, tableTimerSeconds: 60,
    jokersEnabled: true, variantName: 'Classic',
  };

  it('handles multiple assafers — all get 0, caller gets penalty', () => {
    const handValues = { caller: 3, p1: 3, p2: 2, p3: 10 };
    const result = calculateRoundScores(handValues, 'caller', ['p1', 'p2'], settings);
    expect(result.appliedScores).toEqual({ caller: 33, p1: 0, p2: 0, p3: 10 });
    expect(result.wasAssafed).toBe(true);
  });

  it('handles single assafer as array', () => {
    const handValues = { caller: 4, p1: 3, p2: 10 };
    const result = calculateRoundScores(handValues, 'caller', ['p1'], settings);
    expect(result.appliedScores).toEqual({ caller: 34, p1: 0, p2: 10 });
    expect(result.wasAssafed).toBe(true);
  });

  it('handles empty assafer array — successful yaniv', () => {
    const handValues = { caller: 3, p1: 5, p2: 10 };
    const result = calculateRoundScores(handValues, 'caller', [], settings);
    expect(result.appliedScores).toEqual({ caller: 0, p1: 5, p2: 10 });
    expect(result.wasAssafed).toBe(false);
  });

  it('handles assaf disabled with assafer array — ignores assafers', () => {
    const disabledSettings = { ...settings, assafEnabled: false };
    const handValues = { caller: 4, p1: 3 };
    const result = calculateRoundScores(handValues, 'caller', ['p1'], disabledSettings);
    expect(result.appliedScores).toEqual({ caller: 0, p1: 3 });
    expect(result.wasAssafed).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/cliffwilliams/code/yaniv
pnpm vitest run src/lib/engine/scoring.test.ts
```

Expected: New tests FAIL because `calculateRoundScores` still expects `string | undefined`, not `string[]`.

- [ ] **Step 3: Update the Round type**

In `src/lib/types.ts`, change the `Round` interface:

Replace:
```typescript
  assafPlayerId?: string;
```

With:
```typescript
  assafPlayerIds: string[];
```

- [ ] **Step 4: Update calculateRoundScores to accept array**

Replace the `calculateRoundScores` function in `src/lib/engine/scoring.ts`:

```typescript
export function calculateRoundScores(
  handValues: Record<string, number>,
  yanivCallerId: string,
  assafPlayerIds: string[],
  settings: GameSettings
): RoundResult {
  const appliedScores: Record<string, number> = {};
  const wasAssafed = settings.assafEnabled && assafPlayerIds.length > 0;

  for (const [playerId, handValue] of Object.entries(handValues)) {
    if (wasAssafed && playerId === yanivCallerId) {
      appliedScores[playerId] = handValue + settings.assafPenalty;
    } else if (wasAssafed && assafPlayerIds.includes(playerId)) {
      appliedScores[playerId] = 0;
    } else if (!wasAssafed && playerId === yanivCallerId) {
      appliedScores[playerId] = 0;
    } else {
      appliedScores[playerId] = handValue;
    }
  }

  return { appliedScores, wasAssafed };
}
```

- [ ] **Step 5: Update existing tests to use array syntax**

Update all existing `calculateRoundScores` calls in the test file. Where they pass `'assafer'` as the third arg, change to `['assafer']`. Where they pass `undefined`, change to `[]`. For example:

```typescript
// Before:
calculateRoundScores(handValues, 'caller', undefined, settings);
// After:
calculateRoundScores(handValues, 'caller', [], settings);

// Before:
calculateRoundScores(handValues, 'caller', 'p1', settings);
// After:
calculateRoundScores(handValues, 'caller', ['p1'], settings);
```

- [ ] **Step 6: Run all tests**

```bash
cd /Users/cliffwilliams/code/yaniv
pnpm vitest run src/lib/engine/scoring.test.ts
```

Expected: ALL tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/engine/scoring.ts src/lib/engine/scoring.test.ts src/lib/types.ts
git commit -m "feat: support multiple assafers in scoring engine"
```

---

## Task 4: Type Updates

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Update types.ts with new types and updated interfaces**

Replace the entire contents of `src/lib/types.ts`:

```typescript
// === Player ===

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  createdAt: string;
}

// === Game Settings ===

export interface GameSettings {
  scoreLimit: number;
  yanivThreshold: number;
  halvingEnabled: boolean;
  halvingMultiple: number;
  assafEnabled: boolean;
  assafPenalty: number;
  autoAssaf: boolean;
  tableTimerEnabled: boolean;
  tableTimerSeconds: number;
  jokersEnabled: boolean;
  variantName: string;
}

// === Game ===

export interface Game {
  id: string;
  code: string;
  players: GamePlayer[];
  rounds: Round[];
  settings: GameSettings;
  status: 'in_progress' | 'completed' | 'abandoned';
  createdBy: string;
  winnerId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GamePlayer {
  playerId: string;
  name: string;
  avatar: string;
  color: string;
  displayOrder: number;
  eliminated: boolean;
  eliminatedAtRound?: number;
}

// === Round ===

export interface Round {
  id: string;
  roundNumber: number;
  handValues: Record<string, number>;
  appliedScores: Record<string, number>;
  yanivCallerId: string;
  assafPlayerIds: string[];
  wasAssafed: boolean;
  halvingEvents: string[];
  eliminations: string[];
  createdAt: string;
}

// === Spectator ===

export interface Spectator {
  id: string;
  playerId?: string;
  playerName?: string;
  connectedAt: string;
}

// === SSE Events ===

export type GameEvent =
  | { type: 'round_added'; round: Round; game: Game }
  | { type: 'round_edited'; game: Game }
  | { type: 'round_undone'; game: Game }
  | { type: 'game_completed'; game: Game }
  | { type: 'game_abandoned'; game: Game }
  | { type: 'spectator_joined'; spectator: Spectator }
  | { type: 'spectator_left'; spectatorId: string };

// === App Settings (client-only, not in DB) ===

export interface AppSettings {
  defaultGameSettings: GameSettings;
  soundEnabled: boolean;
  soundVolume: number;
  theme: 'dark' | 'light';
}

// === Stats ===

export interface PlayerStats {
  playerId: string;
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

// === API Request/Response types ===

export interface CreateGameRequest {
  players: { name: string; avatar: string; color: string }[];
  settings: GameSettings;
  createdByName: string;
}

export interface AddRoundRequest {
  handValues: Record<string, number>;
  yanivCallerId: string;
  assafPlayerIds?: string[];  // Only sent when auto_assaf is OFF
}

export interface EditRoundRequest {
  handValues: Record<string, number>;
}

export interface JoinGameRequest {
  playerId?: string;  // undefined = anonymous watcher
}
```

- [ ] **Step 2: Add autoAssaf to constants**

In `src/lib/constants.ts`, add `autoAssaf: false` to each variant. Replace the variant definitions:

```typescript
export const VARIANT_CLASSIC: GameSettings = {
  scoreLimit: 200,
  yanivThreshold: 5,
  halvingEnabled: true,
  halvingMultiple: 50,
  assafEnabled: true,
  assafPenalty: 30,
  autoAssaf: false,
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: update types for multiplayer, game codes, auto-assaf"
```

---

## Task 5: Server Utilities — DB, Game Codes, SSE

**Files:**
- Create: `src/lib/server/db.ts`
- Create: `src/lib/server/game-code.ts`
- Create: `src/lib/server/sse.ts`

- [ ] **Step 1: Create database connection module**

Create `src/lib/server/db.ts`:

```typescript
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const DATABASE_URL = env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

- [ ] **Step 2: Create game code generator**

Create `src/lib/server/game-code.ts`:

```typescript
import { sql } from './db';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueGameCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const [existing] = await sql`SELECT id FROM games WHERE code = ${code}`;
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique game code after 10 attempts');
}
```

- [ ] **Step 3: Create SSE connection manager**

Create `src/lib/server/sse.ts`:

```typescript
import type { GameEvent } from '$lib/types';

interface Connection {
  id: string;
  controller: ReadableStreamDefaultController;
}

const gameConnections = new Map<string, Connection[]>();

export function addConnection(gameCode: string, id: string, controller: ReadableStreamDefaultController) {
  const connections = gameConnections.get(gameCode) ?? [];
  connections.push({ id, controller });
  gameConnections.set(gameCode, connections);
}

export function removeConnection(gameCode: string, id: string) {
  const connections = gameConnections.get(gameCode) ?? [];
  const filtered = connections.filter(c => c.id !== id);
  if (filtered.length === 0) {
    gameConnections.delete(gameCode);
  } else {
    gameConnections.set(gameCode, filtered);
  }
}

export function broadcast(gameCode: string, event: GameEvent) {
  const connections = gameConnections.get(gameCode) ?? [];
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  for (const conn of connections) {
    try {
      conn.controller.enqueue(encoded);
    } catch {
      // Connection closed, will be cleaned up
      removeConnection(gameCode, conn.id);
    }
  }
}

export function getConnectionCount(gameCode: string): number {
  return (gameConnections.get(gameCode) ?? []).length;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/
git commit -m "feat: add server utilities — db connection, game codes, SSE manager"
```

---

## Task 6: Database Query Layer — Players

**Files:**
- Create: `src/lib/server/queries/players.ts`

- [ ] **Step 1: Create player queries**

Create `src/lib/server/queries/players.ts`:

```typescript
import { sql } from '../db';
import type { Player } from '$lib/types';

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    name: row.name as string,
    avatar: row.avatar as string,
    color: row.color as string,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export async function findOrCreatePlayer(name: string, avatar: string, color: string): Promise<Player> {
  // Try to find existing player (case-insensitive)
  const [existing] = await sql`
    SELECT * FROM players WHERE lower(name) = lower(${name})
  `;

  if (existing) {
    // Update avatar and color
    const [updated] = await sql`
      UPDATE players SET avatar = ${avatar}, color = ${color}
      WHERE id = ${existing.id}
      RETURNING *
    `;
    return rowToPlayer(updated);
  }

  const [created] = await sql`
    INSERT INTO players (name, avatar, color)
    VALUES (${name}, ${avatar}, ${color})
    RETURNING *
  `;
  return rowToPlayer(created);
}

export async function listPlayers(): Promise<Player[]> {
  const rows = await sql`SELECT * FROM players ORDER BY name ASC`;
  return rows.map(rowToPlayer);
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const [row] = await sql`SELECT * FROM players WHERE id = ${id}`;
  return row ? rowToPlayer(row) : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/queries/players.ts
git commit -m "feat: add player database queries"
```

---

## Task 7: Database Query Layer — Games

**Files:**
- Create: `src/lib/server/queries/games.ts`

- [ ] **Step 1: Create game queries**

Create `src/lib/server/queries/games.ts`:

```typescript
import { sql } from '../db';
import { generateUniqueGameCode } from '../game-code';
import type { Game, GamePlayer, GameSettings, Round, CreateGameRequest } from '$lib/types';
import { findOrCreatePlayer } from './players';

function buildGameFromRows(
  gameRow: Record<string, unknown>,
  playerRows: Record<string, unknown>[],
  roundRows: Record<string, unknown>[],
  scoreRows: Record<string, unknown>[]
): Game {
  const settings: GameSettings = {
    scoreLimit: gameRow.score_limit as number,
    yanivThreshold: gameRow.yaniv_threshold as number,
    halvingEnabled: gameRow.halving_enabled as boolean,
    halvingMultiple: gameRow.halving_multiple as number,
    assafEnabled: gameRow.assaf_enabled as boolean,
    assafPenalty: gameRow.assaf_penalty as number,
    autoAssaf: gameRow.auto_assaf as boolean,
    jokersEnabled: gameRow.jokers_enabled as boolean,
    tableTimerEnabled: gameRow.timer_enabled as boolean,
    tableTimerSeconds: gameRow.timer_seconds as number,
    variantName: gameRow.variant_name as string,
  };

  const players: GamePlayer[] = playerRows.map((r) => ({
    playerId: r.player_id as string,
    name: r.player_name as string,
    avatar: r.avatar as string,
    color: r.color as string,
    displayOrder: r.display_order as number,
    eliminated: r.eliminated as boolean,
    eliminatedAtRound: r.eliminated_at_round as number | undefined,
  }));

  // Group scores by round
  const scoresByRound = new Map<string, Record<string, unknown>[]>();
  for (const s of scoreRows) {
    const roundId = s.round_id as string;
    if (!scoresByRound.has(roundId)) scoresByRound.set(roundId, []);
    scoresByRound.get(roundId)!.push(s);
  }

  const rounds: Round[] = roundRows.map((r) => {
    const roundId = r.id as string;
    const scores = scoresByRound.get(roundId) ?? [];

    const handValues: Record<string, number> = {};
    const appliedScores: Record<string, number> = {};
    const assafPlayerIds: string[] = [];
    const halvingEvents: string[] = [];
    const eliminations: string[] = [];

    for (const s of scores) {
      const pid = s.player_id as string;
      handValues[pid] = s.hand_value as number;
      appliedScores[pid] = s.applied_score as number;
      if (s.was_assafer) assafPlayerIds.push(pid);
      if (s.was_halved) halvingEvents.push(pid);
      if (s.was_eliminated) eliminations.push(pid);
    }

    return {
      id: roundId,
      roundNumber: r.round_number as number,
      handValues,
      appliedScores,
      yanivCallerId: r.yaniv_caller_id as string,
      assafPlayerIds,
      wasAssafed: r.was_assafed as boolean,
      halvingEvents,
      eliminations,
      createdAt: (r.created_at as Date).toISOString(),
    };
  });

  return {
    id: gameRow.id as string,
    code: gameRow.code as string,
    players,
    rounds,
    settings,
    status: gameRow.status as Game['status'],
    createdBy: gameRow.created_by as string,
    winnerId: gameRow.winner_id as string | undefined,
    createdAt: (gameRow.created_at as Date).toISOString(),
    completedAt: gameRow.completed_at ? (gameRow.completed_at as Date).toISOString() : undefined,
  };
}

export async function createGame(req: CreateGameRequest): Promise<Game> {
  const code = await generateUniqueGameCode();

  // Find or create all players
  const createdPlayers = [];
  let createdById = '';
  for (const p of req.players) {
    const player = await findOrCreatePlayer(p.name, p.avatar, p.color);
    createdPlayers.push(player);
    if (p.name.toLowerCase() === req.createdByName.toLowerCase()) {
      createdById = player.id;
    }
  }

  if (!createdById) {
    createdById = createdPlayers[0].id;
  }

  const s = req.settings;

  const [gameRow] = await sql`
    INSERT INTO games (
      code, variant_name, score_limit, yaniv_threshold,
      halving_enabled, halving_multiple, assaf_enabled, assaf_penalty, auto_assaf,
      jokers_enabled, timer_enabled, timer_seconds, created_by
    ) VALUES (
      ${code}, ${s.variantName}, ${s.scoreLimit}, ${s.yanivThreshold},
      ${s.halvingEnabled}, ${s.halvingMultiple}, ${s.assafEnabled}, ${s.assafPenalty}, ${s.autoAssaf},
      ${s.jokersEnabled}, ${s.tableTimerEnabled}, ${s.tableTimerSeconds}, ${createdById}
    )
    RETURNING *
  `;

  // Add players to game
  for (let i = 0; i < createdPlayers.length; i++) {
    await sql`
      INSERT INTO game_players (game_id, player_id, display_order)
      VALUES (${gameRow.id}, ${createdPlayers[i].id}, ${i})
    `;
  }

  return getGameByCode(code) as Promise<Game>;
}

export async function getGameByCode(code: string): Promise<Game | null> {
  const [gameRow] = await sql`SELECT * FROM games WHERE code = ${code}`;
  if (!gameRow) return null;

  const playerRows = await sql`
    SELECT gp.*, p.name AS player_name, p.avatar, p.color
    FROM game_players gp
    JOIN players p ON p.id = gp.player_id
    WHERE gp.game_id = ${gameRow.id}
    ORDER BY gp.display_order
  `;

  const roundRows = await sql`
    SELECT * FROM rounds
    WHERE game_id = ${gameRow.id}
    ORDER BY round_number
  `;

  const roundIds = roundRows.map((r) => r.id);
  const scoreRows = roundIds.length > 0
    ? await sql`SELECT * FROM round_scores WHERE round_id = ANY(${roundIds})`
    : [];

  return buildGameFromRows(gameRow, playerRows, roundRows, scoreRows);
}

export async function listGames(status?: string): Promise<Game[]> {
  const gameRows = status
    ? await sql`SELECT * FROM games WHERE status = ${status} ORDER BY created_at DESC`
    : await sql`SELECT * FROM games ORDER BY created_at DESC`;

  const games: Game[] = [];
  for (const gameRow of gameRows) {
    const playerRows = await sql`
      SELECT gp.*, p.name AS player_name, p.avatar, p.color
      FROM game_players gp
      JOIN players p ON p.id = gp.player_id
      WHERE gp.game_id = ${gameRow.id}
      ORDER BY gp.display_order
    `;
    // For list view, include rounds for score calculation
    const roundRows = await sql`
      SELECT * FROM rounds WHERE game_id = ${gameRow.id} ORDER BY round_number
    `;
    const roundIds = roundRows.map((r) => r.id);
    const scoreRows = roundIds.length > 0
      ? await sql`SELECT * FROM round_scores WHERE round_id = ANY(${roundIds})`
      : [];
    games.push(buildGameFromRows(gameRow, playerRows, roundRows, scoreRows));
  }
  return games;
}

export async function updateGameStatus(code: string, status: 'completed' | 'abandoned', winnerId?: string): Promise<Game | null> {
  await sql`
    UPDATE games
    SET status = ${status},
        winner_id = ${winnerId ?? null},
        completed_at = ${status !== 'in_progress' ? sql`now()` : null}
    WHERE code = ${code}
  `;
  return getGameByCode(code);
}

export async function deleteGame(code: string): Promise<boolean> {
  const result = await sql`DELETE FROM games WHERE code = ${code}`;
  return result.count > 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/queries/games.ts
git commit -m "feat: add game database queries — create, get, list, update, delete"
```

---

## Task 8: Database Query Layer — Rounds

**Files:**
- Create: `src/lib/server/queries/rounds.ts`

- [ ] **Step 1: Create round queries with scoring logic**

Create `src/lib/server/queries/rounds.ts`:

```typescript
import { sql } from '../db';
import { calculateRoundScores, checkHalving, checkElimination, getRunningTotals } from '$lib/engine/scoring';
import { getGameByCode } from './games';
import { broadcast } from '../sse';
import type { Game, GameSettings, AddRoundRequest } from '$lib/types';

function settingsFromGame(game: Game): GameSettings {
  return game.settings;
}

function getActivePlayers(game: Game): string[] {
  return game.players.filter(p => !p.eliminated).map(p => p.playerId);
}

export async function addRound(code: string, req: AddRoundRequest): Promise<Game | null> {
  const game = await getGameByCode(code);
  if (!game || game.status !== 'in_progress') return null;

  const settings = settingsFromGame(game);
  const roundNumber = game.rounds.length + 1;

  // Determine assaf player IDs
  let assafPlayerIds = req.assafPlayerIds ?? [];
  if (settings.autoAssaf && settings.assafEnabled) {
    const callerHandValue = req.handValues[req.yanivCallerId];
    assafPlayerIds = Object.entries(req.handValues)
      .filter(([pid, val]) => pid !== req.yanivCallerId && val <= callerHandValue)
      .map(([pid]) => pid);
  }

  // Calculate scores
  const result = calculateRoundScores(req.handValues, req.yanivCallerId, assafPlayerIds, settings);

  // Apply halving and elimination
  const prevTotals = getRunningTotals(game.rounds);
  const halvingEvents: string[] = [];
  const eliminations: string[] = [];
  const finalScores = { ...result.appliedScores };
  const activePlayers = getActivePlayers(game);

  for (const pid of activePlayers) {
    if (finalScores[pid] === undefined) continue;
    const prevTotal = prevTotals[pid] ?? 0;
    let newTotal = prevTotal + finalScores[pid];

    const halvedTotal = checkHalving(newTotal, settings);
    if (halvedTotal !== newTotal) {
      halvingEvents.push(pid);
      finalScores[pid] = halvedTotal - prevTotal; // Adjusted delta
      newTotal = halvedTotal;
    }

    if (checkElimination(newTotal, settings)) {
      eliminations.push(pid);
    }
  }

  // Insert round
  const [roundRow] = await sql`
    INSERT INTO rounds (game_id, round_number, yaniv_caller_id, was_assafed)
    VALUES (${game.id}, ${roundNumber}, ${req.yanivCallerId}, ${result.wasAssafed})
    RETURNING *
  `;

  // Insert round scores
  for (const [pid, handValue] of Object.entries(req.handValues)) {
    await sql`
      INSERT INTO round_scores (round_id, player_id, hand_value, applied_score, was_assafer, was_halved, was_eliminated)
      VALUES (
        ${roundRow.id}, ${pid}, ${handValue}, ${finalScores[pid]},
        ${assafPlayerIds.includes(pid)}, ${halvingEvents.includes(pid)}, ${eliminations.includes(pid)}
      )
    `;
  }

  // Update eliminations
  for (const pid of eliminations) {
    await sql`
      UPDATE game_players SET eliminated = true, eliminated_at_round = ${roundNumber}
      WHERE game_id = ${game.id} AND player_id = ${pid}
    `;
  }

  // Check if game is over (1 or fewer active players remaining)
  const remainingActive = activePlayers.filter(pid => !eliminations.includes(pid));
  if (remainingActive.length <= 1) {
    const winnerId = remainingActive[0] ?? null;
    await sql`
      UPDATE games SET status = 'completed', winner_id = ${winnerId}, completed_at = now()
      WHERE id = ${game.id}
    `;
  }

  const updatedGame = await getGameByCode(code);
  if (updatedGame) {
    const newRound = updatedGame.rounds[updatedGame.rounds.length - 1];
    if (updatedGame.status === 'completed') {
      broadcast(code, { type: 'game_completed', game: updatedGame });
    } else {
      broadcast(code, { type: 'round_added', round: newRound, game: updatedGame });
    }
  }

  return updatedGame;
}

export async function editRound(code: string, roundNumber: number, newHandValues: Record<string, number>): Promise<Game | null> {
  const game = await getGameByCode(code);
  if (!game) return null;

  // Collect all round inputs, replacing the target round's hand values
  const roundInputs = game.rounds.map((r) => ({
    handValues: r.roundNumber === roundNumber ? newHandValues : r.handValues,
    yanivCallerId: r.yanivCallerId,
    assafPlayerIds: r.assafPlayerIds,
  }));

  // Delete all rounds for this game (cascade deletes round_scores)
  await sql`DELETE FROM rounds WHERE game_id = ${game.id}`;

  // Reset all players
  await sql`
    UPDATE game_players SET eliminated = false, eliminated_at_round = NULL
    WHERE game_id = ${game.id}
  `;

  // Reset game status
  await sql`
    UPDATE games SET status = 'in_progress', winner_id = NULL, completed_at = NULL
    WHERE id = ${game.id}
  `;

  // Replay all rounds
  for (const input of roundInputs) {
    const currentGame = await getGameByCode(code);
    if (!currentGame || currentGame.status !== 'in_progress') break;

    await addRoundInternal(currentGame, input.handValues, input.yanivCallerId, input.assafPlayerIds);
  }

  const updatedGame = await getGameByCode(code);
  if (updatedGame) {
    broadcast(code, { type: 'round_edited', game: updatedGame });
  }
  return updatedGame;
}

// Internal version that doesn't broadcast (used during replay)
async function addRoundInternal(
  game: Game,
  handValues: Record<string, number>,
  yanivCallerId: string,
  assafPlayerIds: string[]
): Promise<void> {
  const settings = settingsFromGame(game);
  const roundNumber = game.rounds.length + 1;

  // Recalculate auto-assaf if enabled
  let effectiveAssafPlayerIds = assafPlayerIds;
  if (settings.autoAssaf && settings.assafEnabled) {
    const callerHandValue = handValues[yanivCallerId];
    effectiveAssafPlayerIds = Object.entries(handValues)
      .filter(([pid, val]) => pid !== yanivCallerId && val <= callerHandValue)
      .map(([pid]) => pid);
  }

  const result = calculateRoundScores(handValues, yanivCallerId, effectiveAssafPlayerIds, settings);

  const prevTotals = getRunningTotals(game.rounds);
  const halvingEvents: string[] = [];
  const eliminations: string[] = [];
  const finalScores = { ...result.appliedScores };
  const activePlayers = game.players.filter(p => !p.eliminated).map(p => p.playerId);

  for (const pid of activePlayers) {
    if (finalScores[pid] === undefined) continue;
    const prevTotal = prevTotals[pid] ?? 0;
    let newTotal = prevTotal + finalScores[pid];

    const halvedTotal = checkHalving(newTotal, settings);
    if (halvedTotal !== newTotal) {
      halvingEvents.push(pid);
      finalScores[pid] = halvedTotal - prevTotal;
      newTotal = halvedTotal;
    }

    if (checkElimination(newTotal, settings)) {
      eliminations.push(pid);
    }
  }

  const [roundRow] = await sql`
    INSERT INTO rounds (game_id, round_number, yaniv_caller_id, was_assafed)
    VALUES (${game.id}, ${roundNumber}, ${yanivCallerId}, ${result.wasAssafed})
    RETURNING *
  `;

  for (const [pid, handValue] of Object.entries(handValues)) {
    await sql`
      INSERT INTO round_scores (round_id, player_id, hand_value, applied_score, was_assafer, was_halved, was_eliminated)
      VALUES (
        ${roundRow.id}, ${pid}, ${handValue}, ${finalScores[pid]},
        ${effectiveAssafPlayerIds.includes(pid)}, ${halvingEvents.includes(pid)}, ${eliminations.includes(pid)}
      )
    `;
  }

  for (const pid of eliminations) {
    await sql`
      UPDATE game_players SET eliminated = true, eliminated_at_round = ${roundNumber}
      WHERE game_id = ${game.id} AND player_id = ${pid}
    `;
  }

  const remainingActive = activePlayers.filter(pid => !eliminations.includes(pid));
  if (remainingActive.length <= 1) {
    const winnerId = remainingActive[0] ?? null;
    await sql`
      UPDATE games SET status = 'completed', winner_id = ${winnerId}, completed_at = now()
      WHERE id = ${game.id}
    `;
  }
}

export async function undoLastRound(code: string): Promise<Game | null> {
  const game = await getGameByCode(code);
  if (!game || game.rounds.length === 0) return null;

  const lastRound = game.rounds[game.rounds.length - 1];

  // Delete the last round (cascade deletes round_scores)
  await sql`DELETE FROM rounds WHERE id = ${lastRound.id}`;

  // Un-eliminate players eliminated in this round
  for (const pid of lastRound.eliminations) {
    await sql`
      UPDATE game_players SET eliminated = false, eliminated_at_round = NULL
      WHERE game_id = ${game.id} AND player_id = ${pid}
    `;
  }

  // Revert game status if it was completed
  if (game.status === 'completed') {
    await sql`
      UPDATE games SET status = 'in_progress', winner_id = NULL, completed_at = NULL
      WHERE id = ${game.id}
    `;
  }

  const updatedGame = await getGameByCode(code);
  if (updatedGame) {
    broadcast(code, { type: 'round_undone', game: updatedGame });
  }
  return updatedGame;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/queries/rounds.ts
git commit -m "feat: add round queries — add, edit (with replay), undo"
```

---

## Task 9: Database Query Layer — Spectators

**Files:**
- Create: `src/lib/server/queries/spectators.ts`

- [ ] **Step 1: Create spectator queries**

Create `src/lib/server/queries/spectators.ts`:

```typescript
import { sql } from '../db';
import { broadcast } from '../sse';
import type { Spectator } from '$lib/types';

function rowToSpectator(row: Record<string, unknown>): Spectator {
  return {
    id: row.id as string,
    playerId: row.player_id as string | undefined,
    playerName: row.player_name as string | undefined,
    connectedAt: (row.connected_at as Date).toISOString(),
  };
}

export async function joinGame(gameCode: string, gameId: string, playerId?: string): Promise<Spectator> {
  // Remove stale connection for same player
  if (playerId) {
    await sql`
      DELETE FROM game_spectators
      WHERE game_id = ${gameId} AND player_id = ${playerId}
    `;
  }

  const [row] = await sql`
    INSERT INTO game_spectators (game_id, player_id)
    VALUES (${gameId}, ${playerId ?? null})
    RETURNING *, NULL AS player_name
  `;

  // Get player name if applicable
  let spectator = rowToSpectator(row);
  if (playerId) {
    const [player] = await sql`SELECT name FROM players WHERE id = ${playerId}`;
    if (player) spectator = { ...spectator, playerName: player.name as string };
  }

  broadcast(gameCode, { type: 'spectator_joined', spectator });
  return spectator;
}

export async function leaveGame(gameCode: string, gameId: string, spectatorId: string): Promise<void> {
  await sql`DELETE FROM game_spectators WHERE id = ${spectatorId} AND game_id = ${gameId}`;
  broadcast(gameCode, { type: 'spectator_left', spectatorId });
}

export async function listSpectators(gameId: string): Promise<Spectator[]> {
  const rows = await sql`
    SELECT gs.*, p.name AS player_name
    FROM game_spectators gs
    LEFT JOIN players p ON p.id = gs.player_id
    WHERE gs.game_id = ${gameId}
    ORDER BY gs.connected_at
  `;
  return rows.map(rowToSpectator);
}

export async function clearSpectators(gameId: string): Promise<void> {
  await sql`DELETE FROM game_spectators WHERE game_id = ${gameId}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/queries/spectators.ts
git commit -m "feat: add spectator queries — join, leave, list"
```

---

## Task 10: API Routes — Players & Games

**Files:**
- Create: `src/routes/api/players/+server.ts`
- Create: `src/routes/api/games/+server.ts`
- Create: `src/routes/api/games/[code]/+server.ts`

- [ ] **Step 1: Create players API route**

Create `src/routes/api/players/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listPlayers, findOrCreatePlayer } from '$lib/server/queries/players';

export const GET: RequestHandler = async () => {
  const players = await listPlayers();
  return json(players);
};

export const POST: RequestHandler = async ({ request }) => {
  const { name, avatar, color } = await request.json();
  if (!name) return json({ error: 'Name is required' }, { status: 400 });

  const player = await findOrCreatePlayer(name, avatar ?? '🃏', color ?? '#e74c3c');
  return json(player, { status: 201 });
};
```

- [ ] **Step 2: Create games list/create API route**

Create `src/routes/api/games/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listGames, createGame } from '$lib/server/queries/games';
import type { CreateGameRequest } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
  const status = url.searchParams.get('status') ?? undefined;
  const games = await listGames(status);
  return json(games);
};

export const POST: RequestHandler = async ({ request }) => {
  const req: CreateGameRequest = await request.json();
  if (!req.players || req.players.length < 2) {
    return json({ error: 'At least 2 players required' }, { status: 400 });
  }
  const game = await createGame(req);
  return json(game, { status: 201 });
};
```

- [ ] **Step 3: Create single game API route**

Create `src/routes/api/games/[code]/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGameByCode, updateGameStatus, deleteGame } from '$lib/server/queries/games';
import { broadcast } from '$lib/server/sse';

export const GET: RequestHandler = async ({ params }) => {
  const game = await getGameByCode(params.code);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });
  return json(game);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const { status, winnerId } = await request.json();
  const game = await updateGameStatus(params.code, status, winnerId);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });

  if (status === 'abandoned') {
    broadcast(params.code, { type: 'game_abandoned', game });
  }
  return json(game);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const deleted = await deleteGame(params.code);
  if (!deleted) return json({ error: 'Game not found' }, { status: 404 });
  return json({ ok: true });
};
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/
git commit -m "feat: add API routes — players CRUD, games CRUD"
```

---

## Task 11: API Routes — Rounds

**Files:**
- Create: `src/routes/api/games/[code]/rounds/+server.ts`
- Create: `src/routes/api/games/[code]/rounds/[num]/+server.ts`
- Create: `src/routes/api/games/[code]/rounds/last/+server.ts`

- [ ] **Step 1: Create add round route**

Create `src/routes/api/games/[code]/rounds/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addRound } from '$lib/server/queries/rounds';
import type { AddRoundRequest } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
  const req: AddRoundRequest = await request.json();
  if (!req.handValues || !req.yanivCallerId) {
    return json({ error: 'handValues and yanivCallerId are required' }, { status: 400 });
  }

  const game = await addRound(params.code, req);
  if (!game) return json({ error: 'Game not found or not in progress' }, { status: 404 });
  return json(game);
};
```

- [ ] **Step 2: Create edit round route**

Create `src/routes/api/games/[code]/rounds/[num]/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { editRound } from '$lib/server/queries/rounds';

export const PUT: RequestHandler = async ({ params, request }) => {
  const { handValues } = await request.json();
  if (!handValues) return json({ error: 'handValues is required' }, { status: 400 });

  const roundNumber = parseInt(params.num);
  if (isNaN(roundNumber)) return json({ error: 'Invalid round number' }, { status: 400 });

  const game = await editRound(params.code, roundNumber, handValues);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });
  return json(game);
};
```

- [ ] **Step 3: Create undo last round route**

Create `src/routes/api/games/[code]/rounds/last/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { undoLastRound } from '$lib/server/queries/rounds';

export const DELETE: RequestHandler = async ({ params }) => {
  const game = await undoLastRound(params.code);
  if (!game) return json({ error: 'Game not found or no rounds to undo' }, { status: 404 });
  return json(game);
};
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/games/\[code\]/rounds/
git commit -m "feat: add API routes — add, edit, undo rounds"
```

---

## Task 12: API Routes — Join, Leave & SSE Stream

**Files:**
- Create: `src/routes/api/games/[code]/join/+server.ts`
- Create: `src/routes/api/games/[code]/spectators/me/+server.ts`
- Create: `src/routes/api/games/[code]/stream/+server.ts`

- [ ] **Step 1: Create join route**

Create `src/routes/api/games/[code]/join/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGameByCode } from '$lib/server/queries/games';
import { joinGame } from '$lib/server/queries/spectators';

export const POST: RequestHandler = async ({ params, request }) => {
  const { playerId } = await request.json();
  const game = await getGameByCode(params.code);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });

  const spectator = await joinGame(params.code, game.id, playerId);
  return json(spectator, { status: 201 });
};
```

- [ ] **Step 2: Create leave route**

Create `src/routes/api/games/[code]/spectators/me/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGameByCode } from '$lib/server/queries/games';
import { leaveGame } from '$lib/server/queries/spectators';

export const DELETE: RequestHandler = async ({ params, request }) => {
  const { spectatorId } = await request.json();
  const game = await getGameByCode(params.code);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });

  await leaveGame(params.code, game.id, spectatorId);
  return json({ ok: true });
};
```

- [ ] **Step 3: Create SSE stream route**

Create `src/routes/api/games/[code]/stream/+server.ts`:

```typescript
import type { RequestHandler } from './$types';
import { addConnection, removeConnection } from '$lib/server/sse';

export const GET: RequestHandler = async ({ params }) => {
  const code = params.code;
  const connectionId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      addConnection(code, connectionId, controller);

      // Send initial keepalive
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(': connected\n\n'));
    },
    cancel() {
      removeConnection(code, connectionId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/games/\[code\]/join/ src/routes/api/games/\[code\]/spectators/ src/routes/api/games/\[code\]/stream/
git commit -m "feat: add API routes — join, leave, SSE stream"
```

---

## Task 13: Frontend — API Client

**Files:**
- Create: `src/lib/stores/api.ts`

- [ ] **Step 1: Create typed API fetch wrapper**

Create `src/lib/stores/api.ts`:

```typescript
import type {
  Player, Game, Spectator,
  CreateGameRequest, AddRoundRequest, EditRoundRequest, JoinGameRequest
} from '$lib/types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }
  return res.json();
}

// Players
export const api = {
  players: {
    list: () => request<Player[]>('/players'),
    create: (name: string, avatar: string, color: string) =>
      request<Player>('/players', {
        method: 'POST',
        body: JSON.stringify({ name, avatar, color }),
      }),
  },

  games: {
    list: (status?: string) =>
      request<Game[]>(`/games${status ? `?status=${status}` : ''}`),
    create: (req: CreateGameRequest) =>
      request<Game>('/games', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    get: (code: string) => request<Game>(`/games/${code}`),
    abandon: (code: string) =>
      request<Game>(`/games/${code}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'abandoned' }),
      }),
    delete: (code: string) =>
      request<void>(`/games/${code}`, { method: 'DELETE' }),
  },

  rounds: {
    add: (code: string, req: AddRoundRequest) =>
      request<Game>(`/games/${code}/rounds`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    edit: (code: string, roundNumber: number, handValues: Record<string, number>) =>
      request<Game>(`/games/${code}/rounds/${roundNumber}`, {
        method: 'PUT',
        body: JSON.stringify({ handValues }),
      }),
    undoLast: (code: string) =>
      request<Game>(`/games/${code}/rounds/last`, { method: 'DELETE' }),
  },

  spectators: {
    join: (code: string, playerId?: string) =>
      request<Spectator>(`/games/${code}/join`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      }),
    leave: (code: string, spectatorId: string) =>
      request<void>(`/games/${code}/spectators/me`, {
        method: 'DELETE',
        body: JSON.stringify({ spectatorId }),
      }),
  },

  stream: (code: string): EventSource => {
    return new EventSource(`${BASE}/games/${code}/stream`);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/api.ts
git commit -m "feat: add typed API client for all endpoints"
```

---

## Task 14: Frontend — Rewrite Game Store

**Files:**
- Modify: `src/lib/stores/game.svelte.ts`
- Delete: `src/lib/stores/storage.svelte.ts`

- [ ] **Step 1: Rewrite game.svelte.ts to use API + SSE**

Replace `src/lib/stores/game.svelte.ts` entirely:

```typescript
import { api } from './api';
import { getRunningTotals } from '$lib/engine/scoring';
import type { Game, GameEvent, CreateGameRequest, AddRoundRequest, Spectator } from '$lib/types';

let activeGame = $state<Game | null>(null);
let spectators = $state<Spectator[]>([]);
let eventSource: EventSource | null = null;
let spectatorId: string | null = null;
let isSpectator = $state(false);

function connectSSE(code: string) {
  disconnectSSE();
  eventSource = api.stream(code);

  eventSource.onmessage = (event) => {
    const data: GameEvent = JSON.parse(event.data);

    switch (data.type) {
      case 'round_added':
      case 'round_edited':
      case 'round_undone':
      case 'game_completed':
      case 'game_abandoned':
        activeGame = data.game;
        break;
      case 'spectator_joined':
        spectators = [...spectators, data.spectator];
        break;
      case 'spectator_left':
        spectators = spectators.filter(s => s.id !== data.spectatorId);
        break;
    }
  };

  eventSource.onerror = () => {
    // Auto-reconnect is built into EventSource
  };
}

function disconnectSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

export const gameStore = {
  get activeGame() { return activeGame; },
  get spectators() { return spectators; },
  get isSpectator() { return isSpectator; },

  get activePlayers() {
    if (!activeGame) return [];
    return activeGame.players.filter(p => !p.eliminated);
  },

  get runningTotals(): Record<string, number> {
    if (!activeGame) return {};
    return getRunningTotals(activeGame.rounds);
  },

  async createGame(req: CreateGameRequest): Promise<Game> {
    const game = await api.games.create(req);
    activeGame = game;
    isSpectator = false;
    connectSSE(game.code);
    return game;
  },

  async loadGame(code: string): Promise<Game | null> {
    const game = await api.games.get(code);
    activeGame = game;
    isSpectator = false;
    connectSSE(code);
    return game;
  },

  async joinAsSpectator(code: string, playerId?: string): Promise<void> {
    const game = await api.games.get(code);
    activeGame = game;
    isSpectator = true;
    const spectator = await api.spectators.join(code, playerId);
    spectatorId = spectator.id;
    connectSSE(code);
  },

  async addRound(req: AddRoundRequest): Promise<void> {
    if (!activeGame) return;
    activeGame = await api.rounds.add(activeGame.code, req);
  },

  async editRound(roundNumber: number, handValues: Record<string, number>): Promise<void> {
    if (!activeGame) return;
    activeGame = await api.rounds.edit(activeGame.code, roundNumber, handValues);
  },

  async undoLastRound(): Promise<void> {
    if (!activeGame) return;
    activeGame = await api.rounds.undoLast(activeGame.code);
  },

  async abandonGame(): Promise<void> {
    if (!activeGame) return;
    activeGame = await api.games.abandon(activeGame.code);
  },

  async leaveGame(): Promise<void> {
    if (activeGame && spectatorId) {
      await api.spectators.leave(activeGame.code, spectatorId).catch(() => {});
    }
    disconnectSSE();
    activeGame = null;
    spectatorId = null;
    isSpectator = false;
  },

  cleanup() {
    disconnectSSE();
    activeGame = null;
    spectators = [];
    spectatorId = null;
    isSpectator = false;
  },
};
```

- [ ] **Step 2: Delete storage.svelte.ts**

```bash
rm /Users/cliffwilliams/code/yaniv/src/lib/stores/storage.svelte.ts
```

- [ ] **Step 3: Rewrite players.svelte.ts**

Replace `src/lib/stores/players.svelte.ts`:

```typescript
import { api } from './api';
import type { Player } from '$lib/types';

let knownPlayers = $state<Player[]>([]);

export const playersStore = {
  get all() { return knownPlayers; },

  async load() {
    knownPlayers = await api.players.list();
  },

  async getOrCreate(name: string, avatar: string, color: string): Promise<Player> {
    const player = await api.players.create(name, avatar, color);
    // Refresh the list
    await this.load();
    return player;
  },

  findByName(name: string): Player | undefined {
    return knownPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
  },
};
```

- [ ] **Step 4: Rewrite settings.svelte.ts for client-only settings**

Replace `src/lib/stores/settings.svelte.ts`:

```typescript
import { browser } from '$app/environment';
import type { AppSettings, GameSettings } from '$lib/types';
import { VARIANT_CLASSIC } from '$lib/constants';

const SETTINGS_KEY = 'yaniv-settings';

const defaultSettings: AppSettings = {
  defaultGameSettings: { ...VARIANT_CLASSIC },
  soundEnabled: true,
  soundVolume: 0.7,
  theme: 'dark',
};

function loadSettings(): AppSettings {
  if (!browser) return defaultSettings;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: AppSettings) {
  if (!browser) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let current = $state<AppSettings>(loadSettings());

export const settingsStore = {
  get current() { return current; },

  updateDefaults(gameSettings: Partial<GameSettings>) {
    current = {
      ...current,
      defaultGameSettings: { ...current.defaultGameSettings, ...gameSettings },
    };
    saveSettings(current);
  },

  setSound(enabled: boolean, volume?: number) {
    current = {
      ...current,
      soundEnabled: enabled,
      ...(volume !== undefined ? { soundVolume: volume } : {}),
    };
    saveSettings(current);
  },

  setTheme(theme: 'dark' | 'light') {
    current = { ...current, theme };
    saveSettings(current);
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/game.svelte.ts src/lib/stores/players.svelte.ts src/lib/stores/settings.svelte.ts
git rm src/lib/stores/storage.svelte.ts
git commit -m "feat: rewrite stores — API + SSE instead of localStorage"
```

---

## Task 15: Frontend — Route Changes

**Files:**
- Rename: `src/routes/game/[id]/` → `src/routes/game/[code]/`
- Modify: `src/routes/game/[code]/+page.svelte`
- Modify: `src/routes/game/[code]/results/+page.svelte`
- Create: `src/routes/join/+page.svelte`
- Create: `src/routes/join/[code]/+page.svelte`
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/game/new/+page.svelte`

- [ ] **Step 1: Rename game route from [id] to [code]**

```bash
cd /Users/cliffwilliams/code/yaniv
mv src/routes/game/\[id\] src/routes/game/\[code\]
```

- [ ] **Step 2: Update active game page to use code param and API**

Rewrite `src/routes/game/[code]/+page.svelte`. Key changes:
- Replace `$page.params.id` with `$page.params.code`
- Replace `gameStore.loadGame(id)` with `await gameStore.loadGame(code)`
- Use `gameStore.activeGame?.code` for navigation
- Add game code display component
- Add spectator badge when `gameStore.isSpectator`
- Hide round entry controls for spectators
- Update `addRound` call to use `AddRoundRequest` format:
  ```typescript
  await gameStore.addRound({
    handValues,
    yanivCallerId,
    assafPlayerIds: assafPlayerId ? [assafPlayerId] : [],
  });
  ```
- When `settings.autoAssaf` is true, don't send `assafPlayerIds` (server computes them):
  ```typescript
  await gameStore.addRound({
    handValues,
    yanivCallerId,
    // No assafPlayerIds — server computes when autoAssaf is on
  });
  ```
- Update `editRound` call: `await gameStore.editRound(roundNumber, newHandValues)`
- Update `undoLastRound` call: `await gameStore.undoLastRound()`
- Update navigation: `goto(\`/game/${gameStore.activeGame.code}/results\`)`
- Add `onDestroy` to call `gameStore.cleanup()` when leaving

- [ ] **Step 3: Update results page to use code param**

In `src/routes/game/[code]/results/+page.svelte`, change:
- `$page.params.id` → `$page.params.code`
- `gameStore.loadGame(id)` → `await gameStore.loadGame(code)`

- [ ] **Step 4: Create join page (enter code)**

Create `src/routes/join/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import Header from '$lib/components/layout/Header.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let code = $state('');
  let error = $state('');

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      error = 'Please enter a valid game code';
      return;
    }
    goto(`/join/${trimmed}`);
  }
</script>

<Header title="Join Game" backHref="/" />

<div class="container mx-auto max-w-md p-4">
  <div class="flex flex-col items-center gap-6 pt-8">
    <p class="text-muted-foreground text-center">Enter the game code shared by the scorekeeper</p>

    <Input
      bind:value={code}
      placeholder="XKCD42"
      class="text-center text-2xl tracking-widest uppercase"
      maxlength={6}
      onkeydown={(e) => e.key === 'Enter' && handleJoin()}
    />

    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}

    <Button onclick={handleJoin} class="w-full" size="lg">Join Game</Button>
  </div>
</div>
```

- [ ] **Step 5: Create direct join page (pick identity)**

Create `src/routes/join/[code]/+page.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import { Button } from '$lib/components/ui/button';
  import { api } from '$lib/stores/api';
  import { gameStore } from '$lib/stores/game.svelte';
  import type { Game } from '$lib/types';

  const code = $page.params.code;
  let game = $state<Game | null>(null);
  let selectedPlayerId = $state<string | undefined>(undefined);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      game = await api.games.get(code);
    } catch {
      error = 'Game not found. Check the code and try again.';
    }
    loading = false;
  });

  async function handleJoin() {
    try {
      await gameStore.joinAsSpectator(code, selectedPlayerId);
      goto(`/game/${code}`);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to join game';
    }
  }
</script>

<Header title="Join Game" backHref="/join" />

<div class="container mx-auto max-w-md p-4">
  {#if loading}
    <p class="text-center text-muted-foreground pt-8">Loading game...</p>
  {:else if error}
    <p class="text-center text-destructive pt-8">{error}</p>
  {:else if game}
    <div class="flex flex-col gap-6 pt-4">
      <div class="text-center">
        <p class="text-muted-foreground text-sm">Joining game</p>
        <p class="text-2xl font-bold tracking-widest">{game.code}</p>
      </div>

      <p class="text-muted-foreground text-sm">Which player are you?</p>

      <div class="flex flex-col gap-2">
        {#each game.players as player}
          <button
            class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {selectedPlayerId === player.playerId ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}"
            onclick={() => selectedPlayerId = player.playerId}
          >
            <span class="text-xl">{player.avatar}</span>
            <span class="font-medium">{player.name}</span>
            {#if selectedPlayerId === player.playerId}
              <span class="ml-auto text-xs text-primary">Selected</span>
            {/if}
          </button>
        {/each}

        <button
          class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {selectedPlayerId === undefined ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}"
          onclick={() => selectedPlayerId = undefined}
        >
          <span class="text-xl">👀</span>
          <span class="text-muted-foreground">Just watching</span>
        </button>
      </div>

      <Button onclick={handleJoin} size="lg" class="w-full">Join Game</Button>
    </div>
  {/if}
</div>
```

- [ ] **Step 6: Update home page with join option and API**

In `src/routes/+page.svelte`, add a "Join Game" button linking to `/join`, and update the in-progress games list to fetch from the API:

```typescript
import { api } from '$lib/stores/api';
import type { Game } from '$lib/types';

let games = $state<Game[]>([]);
onMount(async () => {
  games = await api.games.list('in_progress');
});
```

Replace the existing localStorage-based game loading. Add a "Join Game" button next to "New Game".

- [ ] **Step 7: Update new game page to use API**

In `src/routes/game/new/+page.svelte`, replace the `startGame` function:

```typescript
import { gameStore } from '$lib/stores/game.svelte';
import type { CreateGameRequest } from '$lib/types';

async function startGame() {
  const req: CreateGameRequest = {
    players: playerInputs.map(p => ({
      name: p.name,
      avatar: p.avatar,
      color: p.color,
    })),
    settings: { ...selectedVariant, ...customSettings },
    createdByName: playerInputs[0].name,
  };

  const game = await gameStore.createGame(req);
  goto(`/game/${game.code}`);
}
```

- [ ] **Step 8: Commit**

```bash
git add src/routes/
git commit -m "feat: update routes — code-based URLs, join flow, API integration"
```

---

## Task 16: UI Components — Game Code, Spectator Badge, Auto-Assaf Toggle

**Files:**
- Create: `src/lib/components/game/GameCodeDisplay.svelte`
- Create: `src/lib/components/game/SpectatorBadge.svelte`
- Modify: `src/lib/components/round-entry/RoundEntryPanel.svelte`
- Modify: `src/routes/game/new/+page.svelte` (add auto-assaf toggle to game setup)

- [ ] **Step 1: Create GameCodeDisplay component**

Create `src/lib/components/game/GameCodeDisplay.svelte`:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';

  interface Props {
    code: string;
  }

  let { code }: Props = $props();

  async function copyLink() {
    const url = `${window.location.origin}/join/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  }

  async function share() {
    const url = `${window.location.origin}/join/${code}`;
    if (navigator.share) {
      await navigator.share({ title: 'Join Yaniv Game', url });
    } else {
      await copyLink();
    }
  }
</script>

<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
  <div class="flex-1">
    <p class="text-xs text-muted-foreground uppercase tracking-wide">Game Code</p>
    <p class="text-xl font-bold tracking-widest">{code}</p>
  </div>
  <Button variant="outline" size="sm" onclick={copyLink}>Copy</Button>
  <Button variant="outline" size="sm" onclick={share}>Share</Button>
</div>
```

- [ ] **Step 2: Create SpectatorBadge component**

Create `src/lib/components/game/SpectatorBadge.svelte`:

```svelte
<div class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
  <span>👀</span>
  <span>Spectating</span>
</div>
```

- [ ] **Step 3: Update RoundEntryPanel to hide assaf picker when autoAssaf is on**

In `src/lib/components/round-entry/RoundEntryPanel.svelte`, find the assaf picker section and wrap it with a condition:

```svelte
{#if settings.assafEnabled && !settings.autoAssaf}
  <!-- existing assaf picker UI -->
{/if}
```

When `autoAssaf` is on, the panel should not show the assaf selection at all — the server handles it automatically.

- [ ] **Step 4: Add auto-assaf toggle to game setup**

In `src/routes/game/new/+page.svelte`, in the settings section where `assafEnabled` is toggled, add:

```svelte
{#if settings.assafEnabled}
  <div class="flex items-center justify-between">
    <div>
      <p class="font-medium">Auto-Reveal Assaf</p>
      <p class="text-xs text-muted-foreground">Hands compared automatically — no one needs to call assaf</p>
    </div>
    <Switch bind:checked={settings.autoAssaf} />
  </div>
{/if}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/game/ src/lib/components/round-entry/RoundEntryPanel.svelte src/routes/game/new/+page.svelte
git commit -m "feat: add game code display, spectator badge, auto-assaf toggle"
```

---

## Task 17: Deployment — Dockerfile & Fly Postgres

**Files:**
- Modify: `Dockerfile`
- Delete: `nginx.conf`
- Modify: `fly.toml`

- [ ] **Step 1: Update Dockerfile for Node server**

Replace `Dockerfile`:

```dockerfile
FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/build ./build

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "build/index.js"]
```

- [ ] **Step 2: Delete nginx.conf**

```bash
rm /Users/cliffwilliams/code/yaniv/nginx.conf
```

- [ ] **Step 3: Update fly.toml — add deploy command for migrations**

Add to `fly.toml`:

```toml
[deploy]
  release_command = "node --import tsx migrations/run.ts"
```

This runs migrations before each deploy.

- [ ] **Step 4: Create Fly Postgres database**

```bash
cd /Users/cliffwilliams/code/yaniv
flyctl postgres create --name yaniv-db --region lhr --vm-size shared-cpu-1x --volume-size 1
flyctl postgres attach yaniv-db --app yaniv-score-tracker
```

This creates the database and sets `DATABASE_URL` as a secret on the app.

- [ ] **Step 5: Deploy**

```bash
cd /Users/cliffwilliams/code/yaniv
flyctl deploy
```

Expected: Migrations run during release, Node server starts, app is live.

- [ ] **Step 6: Commit deployment changes**

```bash
git rm nginx.conf
git add Dockerfile fly.toml
git commit -m "feat: update deployment — node server, Fly Postgres, auto-migrations"
```

---

## Task 18: Cleanup & Verification

**Files:**
- Modify: `src/lib/engine/stats.ts` (update to work with new types)
- Modify: `src/routes/history/+page.svelte` (use API)
- Modify: `src/routes/stats/+page.svelte` (use API)

- [ ] **Step 1: Update stats engine for new types**

The `stats.ts` file currently takes the localStorage `Game[]` array. Update it to work with the new `Game` type:
- `game.players[i].knownPlayerId` → `game.players[i].playerId`
- `round.assafPlayerId` → `round.assafPlayerIds` (array)
- Update `timesPerformedAssaf` to count all assafers per round

- [ ] **Step 2: Update history page to use API**

In `src/routes/history/+page.svelte`:
- Replace localStorage game loading with `api.games.list()`
- Update game deletion to use `api.games.delete(game.code)`
- Update navigation links to use `/game/${game.code}` instead of `/game/${game.id}`

- [ ] **Step 3: Update stats page to use API**

In `src/routes/stats/+page.svelte`:
- Fetch games from API: `const games = await api.games.list()`
- Pass to `derivePlayerStats` and `deriveGlobalStats`

- [ ] **Step 4: Fix any remaining localStorage references**

Search the codebase for any remaining references to `storage` or `localStorage`:

```bash
cd /Users/cliffwilliams/code/yaniv
grep -r "storage" src/lib/stores/ --include="*.ts" --include="*.svelte"
grep -r "localStorage" src/ --include="*.ts" --include="*.svelte"
```

Fix any found references (settings.svelte.ts is the only file that should still use localStorage).

- [ ] **Step 5: Run full build and tests**

```bash
cd /Users/cliffwilliams/code/yaniv
pnpm vitest run
pnpm build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: update stats, history, and remaining pages to use API"
```

---

## Task 19: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/fly-io-deploy.md` (update status)

- [ ] **Step 1: Update README with new architecture**

Add sections covering:
- PostgreSQL requirement and setup
- Game codes and multiplayer
- Auto-assaf rule
- Development setup: `DATABASE_URL` env var needed for local dev
- Deployment: Fly Postgres attachment, auto-migrations

- [ ] **Step 2: Archive the fly-io-deploy plan, update spec status**

Move `docs/plans/fly-io-deploy.md` to `docs/plans/archive/` and update the multiplayer spec status to "Implemented".

- [ ] **Step 3: Commit**

```bash
git add README.md docs/
git commit -m "docs: update README and plans for multiplayer architecture"
```
