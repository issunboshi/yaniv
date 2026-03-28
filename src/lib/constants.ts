import type { GameSettings } from './types';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'yaniv-app';
export const STORAGE_WARNING_BYTES = 4 * 1024 * 1024; // 4MB

export const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'
] as const;

export const PLAYER_AVATARS = [
  '🃏', '🂡', '🎴', '🎲', '🎯', '🏆'
] as const;

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

export const VARIANTS = {
  Classic: VARIANT_CLASSIC,
  Quick: VARIANT_QUICK,
  Marathon: VARIANT_MARATHON,
} as const;

export const CARD_VALUES: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'Joker': 0,
};
