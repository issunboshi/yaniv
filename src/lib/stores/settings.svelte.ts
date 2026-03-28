import { browser } from '$app/environment';
import type { AppSettings, GameSettings } from '$lib/types';
import { VARIANT_CLASSIC } from '$lib/constants';

const SETTINGS_KEY = 'yaniv-settings';

const defaultSettings: AppSettings = {
  defaultGameSettings: { ...VARIANT_CLASSIC },
  soundEnabled: true,
  soundVolume: 0.7,
  theme: 'dark',
};

function loadSettings(): AppSettings {
  if (!browser) return defaultSettings;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: AppSettings) {
  if (!browser) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let current = $state<AppSettings>(loadSettings());

export const settingsStore = {
  get current() { return current; },

  updateDefaults(gameSettings: Partial<GameSettings>) {
    current = {
      ...current,
      defaultGameSettings: { ...current.defaultGameSettings, ...gameSettings },
    };
    saveSettings(current);
  },

  setSound(enabled: boolean, volume?: number) {
    current = {
      ...current,
      soundEnabled: enabled,
      ...(volume !== undefined ? { soundVolume: volume } : {}),
    };
    saveSettings(current);
  },

  setTheme(theme: 'dark' | 'light') {
    current = { ...current, theme };
    saveSettings(current);
  },
};
