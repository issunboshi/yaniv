import { api } from './api';
import type { Player } from '$lib/types';

let knownPlayers = $state<Player[]>([]);

export const playersStore = {
  get all() { return knownPlayers; },

  async load() {
    knownPlayers = await api.players.list();
  },

  async getOrCreate(name: string, avatar: string, color: string): Promise<Player> {
    const player = await api.players.create(name, avatar, color);
    await this.load();
    return player;
  },

  findByName(name: string): Player | undefined {
    return knownPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
  },
};
