# Yaniv Score Tracker

A mobile-first Progressive Web App for tracking scores in the card game Yaniv. Built with a Balatro-inspired dark green and amber theme.

## Features

- Track scores across multiple rounds with full game history
- Support for game variants: Classic, Competitive, and Family rules
- Yaniv and Assaf call detection with penalty scoring
- Auto-Assaf: optional rule where hands are compared automatically without manual entry
- Score halving at configurable multiples (e.g. 50, 100)
- Player elimination when score limit is reached
- Advisory table timer with circular countdown
- Sound effects for key game events (Yaniv, Assaf, halving, elimination, win)
- Player statistics across all games
- Card value reference page
- Full game history with share/export
- Dark and light theme support
- Offline-capable PWA (installable on iOS and Android)
- **Multiplayer**: Share a 6-character game code so others can join and track scores together in real time

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) 2 with Svelte 5 runes, using `adapter-node` for server-side rendering
- [Tailwind CSS](https://tailwindcss.com/) 4 with Balatro-inspired custom theme
- [bits-ui](https://www.bits-ui.com/) component primitives
- [Howler.js](https://howlerjs.com/) for audio
- [Vite PWA](https://vite-pwa-org.netlify.app/) / Workbox for service worker
- **PostgreSQL** for persistent game state
- **Server-Sent Events (SSE)** for real-time score updates across clients
- [Fly.io](https://fly.io/) for deployment with Fly Postgres

## Architecture

The app is a SvelteKit application using `adapter-node`, deployed as a Node.js server rather than a static site.

- **Database**: PostgreSQL stores all game and round data. The schema is managed via plain SQL migration files in `src/lib/server/db/migrations/`.
- **Real-time updates**: When a round is saved, the server broadcasts a score update to all connected clients via SSE. Each game has its own SSE endpoint that clients subscribe to.
- **Game codes**: Games are assigned a random 6-character alphanumeric code on creation. Share the code so others can open the game on their own device. Spectators join the game view and can optionally claim a player identity (their name appears highlighted).

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm
- A PostgreSQL database

### Environment Variables

Create a `.env` file (or set environment variables) with:

```
DATABASE_URL=postgres://user:password@localhost:5432/yaniv
```

### Running Locally

```sh
# Install dependencies
pnpm install

# Run database migrations (creates tables)
pnpm migrate

# Start development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Building

```sh
pnpm build
```

Preview the production build:

```sh
pnpm preview
```

The build output is written to `build/` as a Node.js server application.

## Deploying to Fly.io

The app is deployed to [Fly.io](https://fly.io/) using Fly Postgres for the database.

```sh
# First time setup (creates the app and attaches a Postgres cluster)
fly launch
fly postgres create
fly postgres attach <postgres-app-name>

# Deploy
fly deploy
```

Database migrations run automatically on each deploy via the `release_command` in `fly.toml`. No manual migration step is needed in production.

The `DATABASE_URL` secret is set automatically when attaching a Fly Postgres database.

## Project Structure

```
src/
  lib/
    components/   # UI components (scoreboard, round-entry, timer, etc.)
    engine/       # Pure scoring & stats logic (fully tested)
    stores/       # Svelte 5 reactive stores (game, players, settings, audio)
    server/
      db/         # Database client and SQL migration files
    types.ts      # TypeScript types
    constants.ts  # Game variant presets and constants
  routes/         # SvelteKit file-based routing
static/
  sounds/         # WAV sound effect files
  favicon.svg     # App icon
docs/
  plans/          # Feature planning docs
  plans/archive/  # Completed/implemented plans
```

## Screenshot

![Yaniv Score Tracker home screen](docs/screenshot-placeholder.png)
