import { describe, it, expect } from 'vitest';
import { calculateRoundScores, getRunningTotals, checkElimination, checkHalving } from './scoring';
import type { GameSettings, Round } from '$lib/types';
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
    expect(result.appliedScores.p1).toBe(5 + 30);
    expect(result.appliedScores.p2).toBe(0);
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
        number: 1, handValues: { p1: 5, p2: 12 }, appliedScores: { p1: 0, p2: 12 },
        yanivCallerId: 'p1', wasAssafed: false,
        halvingEvents: [], eliminations: [], timestamp: '2026-01-01T00:00:00Z'
      },
      {
        number: 2, handValues: { p1: 7, p2: 3 }, appliedScores: { p1: 7, p2: 0 },
        yanivCallerId: 'p2', wasAssafed: false,
        halvingEvents: [], eliminations: [], timestamp: '2026-01-01T00:01:00Z'
      }
    ];
    const totals = getRunningTotals(rounds);
    expect(totals.p1).toBe(7);
    expect(totals.p2).toBe(12);
  });
});

describe('halving + running totals integration', () => {
  it('appliedScores adjusted for halving produce correct running totals', () => {
    const round1: Round = {
      number: 1, handValues: { p1: 45 }, appliedScores: { p1: 45 },
      yanivCallerId: 'p2', wasAssafed: false,
      halvingEvents: [], eliminations: [], timestamp: '2026-01-01T00:00:00Z'
    };
    const round2: Round = {
      number: 2, handValues: { p1: 5 }, appliedScores: { p1: -20 },
      yanivCallerId: 'p2', wasAssafed: false,
      halvingEvents: ['p1'], eliminations: [], timestamp: '2026-01-01T00:01:00Z'
    };
    const totals = getRunningTotals([round1, round2]);
    expect(totals.p1).toBe(25);
  });
});
