import type { GameSettings, Round } from '$lib/types';

export interface RoundResult {
  appliedScores: Record<string, number>;
  wasAssafed: boolean;
}

// NOTE: appliedScores stores the adjusted delta after halving occurs in the game store.
// When halving triggers, the game store adjusts appliedScores so that getRunningTotals
// (which simply sums appliedScores) produces correct cumulative totals.
// This means appliedScores can be negative after halving.

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
