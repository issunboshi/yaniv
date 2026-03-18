import { storage } from './storage.svelte';
import type { AppSettings, GameSettings } from '$lib/types';

export const settingsStore = {
  get current() { return storage.appSettings; },

  updateDefaults(gameSettings: Partial<GameSettings>) {
    storage.updateAppSettings({
      defaultGameSettings: { ...storage.appSettings.defaultGameSettings, ...gameSettings },
    });
  },

  setSound(enabled: boolean, volume?: number) {
    storage.updateAppSettings({
      soundEnabled: enabled,
      ...(volume !== undefined ? { soundVolume: volume } : {}),
    });
  },

  setTheme(theme: 'dark' | 'light') {
    storage.updateAppSettings({ theme });
  },
};
