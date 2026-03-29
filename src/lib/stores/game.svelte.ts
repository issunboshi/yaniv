import { browser } from '$app/environment';
import { api } from './api';
import { getRunningTotals } from '$lib/engine/scoring';
import type { Game, GameEvent, CreateGameRequest, AddRoundRequest, Spectator } from '$lib/types';

const SPECTATOR_KEY = 'yaniv-spectator';

function saveSpectatorState(code: string, specId: string) {
  if (browser) sessionStorage.setItem(SPECTATOR_KEY, JSON.stringify({ code, spectatorId: specId }));
}

function loadSpectatorState(code: string): string | null {
  if (!browser) return null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(SPECTATOR_KEY) ?? 'null');
    return stored?.code === code ? stored.spectatorId : null;
  } catch { return null; }
}

function clearSpectatorState() {
  if (browser) sessionStorage.removeItem(SPECTATOR_KEY);
}

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
    clearSpectatorState();
    connectSSE(game.code);
    return game;
  },

  async loadGame(code: string): Promise<Game | null> {
    const game = await api.games.get(code);
    activeGame = game;
    const savedSpectatorId = loadSpectatorState(code);
    if (savedSpectatorId) {
      isSpectator = true;
      spectatorId = savedSpectatorId;
    } else {
      isSpectator = false;
    }
    connectSSE(code);
    return game;
  },

  async joinAsSpectator(code: string, playerId?: string): Promise<void> {
    const game = await api.games.get(code);
    activeGame = game;
    isSpectator = true;
    const spectator = await api.spectators.join(code, playerId);
    spectatorId = spectator.id;
    saveSpectatorState(code, spectator.id);
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
    clearSpectatorState();
  },

  cleanup() {
    disconnectSSE();
    activeGame = null;
    spectators = [];
    spectatorId = null;
    isSpectator = false;
  },
};
