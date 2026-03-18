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
