# Yaniv Score Tracker

A mobile-first Progressive Web App for tracking scores in the card game Yaniv. Built with a Balatro-inspired dark green and amber theme.

## Features

- Track scores across multiple rounds with full game history
- Support for game variants: Classic, Competitive, and Family rules
- Yaniv and Assaf call detection with penalty scoring
- Score halving at configurable multiples (e.g. 50, 100)
- Player elimination when score limit is reached
- Advisory table timer with circular countdown
- Sound effects for key game events (Yaniv, Assaf, halving, elimination, win)
- Player statistics across all games
- Card value reference page
- Full game history with share/export
- Dark and light theme support
- Offline-capable PWA (installable on iOS and Android)

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) 2 with Svelte 5 runes
- [Tailwind CSS](https://tailwindcss.com/) 4 with Balatro-inspired custom theme
- [bits-ui](https://www.bits-ui.com/) component primitives
- [Howler.js](https://howlerjs.com/) for audio
- [Vite PWA](https://vite-pwa-org.netlify.app/) / Workbox for service worker
- [Cloudflare Pages](https://pages.cloudflare.com/) for deployment
- `localStorage` for all persistent state (no backend required)

## Running Locally

```sh
# Install dependencies
pnpm install

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

The build output is written to `build/` as a fully static site.

## Deploying to Cloudflare Pages

1. Push to GitHub.
2. Connect the repo to Cloudflare Pages.
3. Set build command: `pnpm build`
4. Set output directory: `build`
5. Deploy.

No environment variables are required — all state is stored in the browser's `localStorage`.

## Project Structure

```
src/
  lib/
    components/   # UI components (scoreboard, round-entry, timer, etc.)
    engine/       # Pure scoring & stats logic (fully tested)
    stores/       # Svelte 5 reactive stores (game, players, settings, audio)
    types.ts      # TypeScript types
    constants.ts  # Game variant presets and constants
  routes/         # SvelteKit file-based routing
static/
  sounds/         # WAV sound effect files
  favicon.svg     # App icon
```

## Screenshot

![Yaniv Score Tracker home screen](docs/screenshot-placeholder.png)
