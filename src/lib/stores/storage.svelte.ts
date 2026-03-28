import { SCHEMA_VERSION, STORAGE_KEY, STORAGE_WARNING_BYTES } from '$lib/constants';
import type { AppSettings, Game, Player } from '$lib/types';
import { VARIANT_CLASSIC } from '$lib/constants';

const defaultAppSettings: AppSettings = {
  defaultGameSettings: VARIANT_CLASSIC,
  soundEnabled: true,
  soundVolume: 0.7,
  theme: 'dark',
};

interface StorageEnvelope {
  schemaVersion: number;
  knownPlayers: Player[];
  games: Game[];
  appSettings: AppSettings;
}

const defaultEnvelope: StorageEnvelope = {
  schemaVersion: SCHEMA_VERSION,
  knownPlayers: [],
  games: [],
  appSettings: defaultAppSettings,
};

function load(): StorageEnvelope {
  if (typeof window === 'undefined') return { ...defaultEnvelope };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultEnvelope };
    const data = JSON.parse(raw) as StorageEnvelope;
    return data;
  } catch {
    return { ...defaultEnvelope };
  }
}

function save(envelope: StorageEnvelope): boolean {
  try {
    const json = JSON.stringify(envelope);
    if (json.length > STORAGE_WARNING_BYTES) {
      console.warn(`Yaniv storage approaching limit: ${(json.length / 1024 / 1024).toFixed(1)}MB`);
    }
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return false;
  }
}

let envelope = $state<StorageEnvelope>(load());

export const storage = {
  get data() { return envelope; },
  get games() { return envelope.games; },
  get knownPlayers() { return envelope.knownPlayers; },
  get appSettings() { return envelope.appSettings; },

  saveGame(game: Game) {
    const idx = envelope.games.findIndex(g => g.id === game.id);
    if (idx >= 0) {
      envelope.games[idx] = game;
    } else {
      envelope.games.push(game);
    }
    save(envelope);
  },

  deleteGame(gameId: string) {
    envelope.games = envelope.games.filter(g => g.id !== gameId);
    save(envelope);
  },

  clearAllGames() {
    envelope.games = [];
    save(envelope);
  },

  saveKnownPlayer(player: Player) {
    const idx = envelope.knownPlayers.findIndex(p => p.id === player.id);
    if (idx >= 0) {
      envelope.knownPlayers[idx] = player;
    } else {
      envelope.knownPlayers.push(player);
    }
    save(envelope);
  },

  updateAppSettings(settings: Partial<AppSettings>) {
    envelope.appSettings = { ...envelope.appSettings, ...settings };
    save(envelope);
  },

  clearAll() {
    envelope = { ...defaultEnvelope };
    save(envelope);
  },
};
