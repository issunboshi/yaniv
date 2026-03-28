import { storage } from './storage.svelte';
import { generateId } from '$lib/utils';
import type { Player } from '$lib/types';

export const playersStore = {
  get all() { return storage.knownPlayers; },

  findByName(name: string) {
    return storage.knownPlayers.find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
  },

  getOrCreate(name: string, avatar: string, color: string): Player {
    const existing = this.findByName(name);
    if (existing) {
      const updated = { ...existing, avatar, color };
      storage.saveKnownPlayer(updated);
      return updated;
    }
    const player: Player = { id: generateId(), name, avatar, color, createdAt: new Date().toISOString() };
    storage.saveKnownPlayer(player);
    return player;
  },
};
