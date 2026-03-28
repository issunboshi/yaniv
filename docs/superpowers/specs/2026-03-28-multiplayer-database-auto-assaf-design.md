# Multiplayer, Database & Auto-Assaf Design

## Overview

Transform the Yaniv score tracker from a client-only SPA (localStorage) into a server-backed multiplayer app with PostgreSQL persistence and real-time game sharing. Also add an optional auto-assaf rule variant.

Three interconnected changes:
1. **PostgreSQL database** — all game data persisted server-side
2. **Multiplayer via game codes** — spectators join with a short code, claim player identity, see live scoreboard
3. **Auto-assaf rule** — optional setting where hands are compared automatically after Yaniv is called

## Decisions Made

- **SvelteKit adapter-node** — single codebase, API routes via `+server.ts` files, one Fly.io deployment
- **Server-only persistence** — no offline/localStorage mode, all games require the server
- **SSE for live updates** — spectators are read-only, so one-way Server-Sent Events (no WebSockets needed)
- **One scorekeeper model** — one person enters scores, everyone else watches live
- **Player identity claiming** — spectators pick which player they are from the game's player list for a personalised view
- **Big bang migration** — replace localStorage with API calls in one cohesive redesign

## Database Schema

### players
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text NOT NULL | |
| avatar | text | |
| color | text | |
| created_at | timestamptz | |

Unique constraint on `lower(name)` for case-insensitive matching.

### games
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Internal only |
| code | text UNIQUE NOT NULL | 6-char alphanumeric join code |
| status | text NOT NULL | 'in_progress', 'completed', 'abandoned' |
| variant_name | text | |
| score_limit | int NOT NULL | |
| yaniv_threshold | int NOT NULL | |
| halving_enabled | bool NOT NULL | |
| halving_multiple | int | |
| assaf_enabled | bool NOT NULL | |
| assaf_penalty | int | |
| auto_assaf | bool NOT NULL DEFAULT false | New: auto-reveal mode |
| jokers_enabled | bool NOT NULL | |
| timer_enabled | bool NOT NULL | |
| timer_seconds | int | |
| created_by | uuid FK → players | The scorekeeper |
| winner_id | uuid FK → players | Set on completion |
| created_at | timestamptz NOT NULL | |
| completed_at | timestamptz | |

Game settings are flattened into this table since they are immutable per-game.

### game_players
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| game_id | uuid FK → games | |
| player_id | uuid FK → players | |
| display_order | int NOT NULL | Seating order |
| eliminated | bool NOT NULL DEFAULT false | |
| eliminated_at_round | int | |

Unique constraint on `(game_id, player_id)`.

### rounds
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| game_id | uuid FK → games | |
| round_number | int NOT NULL | 1-based |
| yaniv_caller_id | uuid FK → players | |
| was_assafed | bool NOT NULL DEFAULT false | |
| created_at | timestamptz NOT NULL | |

Unique constraint on `(game_id, round_number)`.

### round_scores
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| round_id | uuid FK → rounds | |
| player_id | uuid FK → players | |
| hand_value | int NOT NULL | Raw hand value |
| applied_score | int NOT NULL | Effective delta (may be negative for halving) |
| was_assafer | bool NOT NULL DEFAULT false | Supports multiple assafers |
| was_halved | bool NOT NULL DEFAULT false | |
| was_eliminated | bool NOT NULL DEFAULT false | |

Unique constraint on `(round_id, player_id)`.

### game_spectators
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| game_id | uuid FK → games | |
| player_id | uuid FK → players | Nullable — null for anonymous watchers |
| connected_at | timestamptz NOT NULL | |

Tracks active connections. Stale records are cleaned up when a new SSE connection is established for the same player, or when the game completes/is abandoned.

## API Routes

```
POST   /api/players              — create or find player (by name, case-insensitive)
GET    /api/players               — list known players (for autocomplete)

POST   /api/games                 — create game (returns game with join code)
GET    /api/games                 — list games (filters: status, player)
GET    /api/games/[code]          — get full game state by join code
PATCH  /api/games/[code]          — update game (abandon, complete)
DELETE /api/games/[code]          — delete game

POST   /api/games/[code]/rounds           — add a round
PUT    /api/games/[code]/rounds/[num]     — edit a round (triggers full replay)
DELETE /api/games/[code]/rounds/last      — undo last round

POST   /api/games/[code]/join             — claim player identity as spectator
DELETE /api/games/[code]/spectators/me    — leave game

GET    /api/games/[code]/stream           — SSE endpoint for live updates
```

### Key behaviours

- **Game codes in URLs** — `/game/XKCD42` is shareable. UUIDs are internal PKs only.
- **Scoring runs server-side** — client sends hand values, server runs `scoring.ts` engine and returns computed results.
- **Round edit triggers full replay** — same strategy as the current `editRound`: replay all rounds from scratch to recalculate halving and eliminations correctly.
- **SSE events**: `round_added`, `round_edited`, `round_undone`, `game_completed`, `game_abandoned`, `spectator_joined`, `spectator_left`.

## Multiplayer Join Flow

### Game creation
Scorekeeper creates a game as today. Server generates a 6-character alphanumeric code. The game page shows the code prominently with "Copy Link" and "Share" buttons.

### Joining
Two entry points:
- `/join` page — enter code manually
- `/join/[code]` — direct link (e.g. `yaniv-score-tracker.fly.dev/join/XKCD42`)

After entering a valid code, the spectator picks their identity from the game's player list, or selects "Just watching" for anonymous viewing. One player identity per spectator connection — already-claimed identities are shown as taken.

### Live viewing
After joining, the SSE stream starts. Spectators see the same scoreboard as the scorekeeper, updated in real time. A subtle badge indicates view-only mode. The scorekeeper sees who's connected.

### Route changes
| Route | Change |
|-------|--------|
| `/` | Add "Join Game" option to home page |
| `/game/new` | Same flow, now generates a code |
| `/game/[code]` | Was `/game/[id]` — uses code instead of UUID |
| `/game/[code]/results` | Was `/game/[id]/results` |
| `/join` | New — enter game code page |
| `/join/[code]` | New — direct join link |

## Auto-Assaf Rule

### Setting
New boolean `auto_assaf` in game settings, default `false`. Only visible in game setup UI when `assaf_enabled` is `true`.

### Behaviour when OFF (default)
Existing manual flow. Scorekeeper picks who called assaf from UI, or clicks "No Assaf".

### Behaviour when ON
1. Scorekeeper enters hand values and who called Yaniv — same UI
2. Assaf picker UI is hidden entirely
3. Server compares all hand values automatically:
   - Any non-caller player with `handValue <= callerHandValue` is an assafer
   - Multiple assafers possible — all get 0, caller gets `handValue + assafPenalty`
   - If no one qualifies, successful Yaniv (caller gets 0)
4. Scoreboard shows auto-assaf events

### Engine change
`calculateRoundScores` signature changes from accepting a single `assafPlayerId` to an array `assafPlayerIds: string[]`. The engine doesn't know about the `auto_assaf` setting — the API route computes the assafer list from hand values when auto-assaf is on, and passes a single-element (or empty) array when it's off.

## Architecture

### System overview
```
Scorekeeper ──HTTP POST──→ SvelteKit Server (adapter-node) ──SQL──→ Fly Postgres
Scorekeeper ←──SSE──────── SvelteKit Server
Spectators  ←──SSE──────── SvelteKit Server
```

### Round submission flow
1. Scorekeeper POSTs hand values + yaniv caller (+ assaf caller if manual mode)
2. Server computes assafer list (auto-assaf) or uses provided value
3. Server runs `calculateRoundScores` engine
4. Server runs `checkHalving` and `checkElimination` per player
5. Database: INSERT round + round_scores, UPDATE game_players (eliminations)
6. If one player remaining: UPDATE game status=completed, set winner_id
7. SSE broadcasts `round_added` event to all connected clients
8. All clients update local reactive state from event data

### Project structure changes

**New files:**
- `src/lib/server/db.ts` — pg pool and connection
- `src/lib/server/queries/` — typed SQL query functions
- `src/lib/server/sse.ts` — SSE connection manager
- `src/lib/server/game-code.ts` — code generation
- `src/lib/stores/api.ts` — fetch wrapper for API calls
- `src/routes/api/` — all API endpoint files
- `src/routes/join/` — join game pages
- `migrations/` — SQL migration files

**Modified files:**
- `src/lib/engine/scoring.ts` — accept `assafPlayerIds[]` instead of single ID
- `src/lib/stores/game.svelte.ts` — rewrite to use API calls + SSE instead of localStorage
- `src/lib/types.ts` — add auto_assaf, game code, spectator types
- `src/routes/game/[id]/` → `src/routes/game/[code]/` — route param change
- `svelte.config.js` — adapter-static → adapter-node
- `Dockerfile` — node server instead of nginx

**Deleted files:**
- `src/lib/stores/storage.svelte.ts` — no more localStorage

### Deployment
- SvelteKit with adapter-node on Fly.io (replaces nginx static serving)
- Fly Postgres for the database
- Dockerfile changes to run node server directly
- Single `fly deploy` still works

### Database driver
Use `postgres` (postgres.js) — lightweight, zero-dependency Postgres driver that works well with SvelteKit. Connection via `DATABASE_URL` environment variable set by Fly Postgres.

### Migrations
Plain SQL files in `migrations/` directory, numbered sequentially (e.g. `001_initial_schema.sql`). Run manually or via a simple script — no ORM.
