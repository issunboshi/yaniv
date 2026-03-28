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

  addRound(handValues: Record<string, number>, yanivCallerId: string, assafPlayerIds: string[] = []) {
    if (!activeGame) return;

    const { appliedScores, wasAssafed } = calculateRoundScores(
      handValues, yanivCallerId, assafPlayerIds, activeGame.settings
    );

    const prevTotals = getRunningTotals(activeGame.rounds);
    const halvingEvents: string[] = [];
    const eliminations: string[] = [];

    for (const player of activeGame.players) {
      if (player.eliminated) continue;
      const pid = player.knownPlayerId;
      let newTotal = (prevTotals[pid] ?? 0) + (appliedScores[pid] ?? 0);

      const halvedTotal = checkHalving(newTotal, activeGame.settings);
      if (halvedTotal !== newTotal) {
        halvingEvents.push(pid);
        appliedScores[pid] = halvedTotal - (prevTotals[pid] ?? 0);
        newTotal = halvedTotal;
      }

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
      assafPlayerIds,
      wasAssafed,
      halvingEvents,
      eliminations,
      timestamp: new Date().toISOString(),
    };

    activeGame.rounds.push(round);

    const activePlayers = activeGame.players.filter(p => !p.eliminated);
    if (activePlayers.length <= 1) {
      activeGame.status = 'completed';
      activeGame.completedAt = new Date().toISOString();
      activeGame.winnerId = activePlayers[0]?.knownPlayerId;
    }

    storage.saveGame(activeGame);
    return round;
  },

  editRound(roundIndex: number, newHandValues: Record<string, number>) {
    if (!activeGame || roundIndex < 0 || roundIndex >= activeGame.rounds.length) return;

    // Collect replay inputs: update target round's hand values, keep caller/assaf the same
    const replayInputs = activeGame.rounds.map((r, i) => ({
      handValues: i === roundIndex ? newHandValues : { ...r.handValues },
      yanivCallerId: r.yanivCallerId,
      assafPlayerIds: r.assafPlayerIds,
    }));

    // Reset all rounds and player state
    activeGame.rounds = [];
    for (const player of activeGame.players) {
      player.eliminated = false;
      player.eliminatedAtRound = undefined;
    }
    activeGame.status = 'in_progress';
    activeGame.completedAt = undefined;
    activeGame.winnerId = undefined;

    // Replay each round through normal addRound logic
    for (const input of replayInputs) {
      this.addRound(input.handValues, input.yanivCallerId, input.assafPlayerIds);
      if ((activeGame.status as string) === 'completed') break;
    }

    storage.saveGame(activeGame);
  },

  undoLastRound() {
    if (!activeGame || activeGame.rounds.length === 0) return;

    const lastRound = activeGame.rounds.pop()!;

    for (const pid of lastRound.eliminations) {
      const player = activeGame.players.find(p => p.knownPlayerId === pid);
      if (player) {
        player.eliminated = false;
        player.eliminatedAtRound = undefined;
      }
    }

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
