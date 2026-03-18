import { storage } from './storage.svelte';
import { generateId } from '$lib/utils';
import type { KnownPlayer } from '$lib/types';

export const playersStore = {
  get all() { return storage.knownPlayers; },

  findByName(name: string) {
    return storage.knownPlayers.find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
  },

  getOrCreate(name: string, avatar: string, color: string): KnownPlayer {
    const existing = this.findByName(name);
    if (existing) {
      const updated = { ...existing, avatar, color };
      storage.saveKnownPlayer(updated);
      return updated;
    }
    const player: KnownPlayer = { id: generateId(), name, avatar, color };
    storage.saveKnownPlayer(player);
    return player;
  },
};
