import type {
  Player, Game, Spectator,
  CreateGameRequest, AddRoundRequest, JoinGameRequest
} from '$lib/types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  players: {
    list: () => request<Player[]>('/players'),
    create: (name: string, avatar: string, color: string) =>
      request<Player>('/players', {
        method: 'POST',
        body: JSON.stringify({ name, avatar, color }),
      }),
  },

  games: {
    list: (status?: string) =>
      request<Game[]>(`/games${status ? `?status=${status}` : ''}`),
    create: (req: CreateGameRequest) =>
      request<Game>('/games', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    get: (code: string) => request<Game>(`/games/${code}`),
    abandon: (code: string) =>
      request<Game>(`/games/${code}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'abandoned' }),
      }),
    delete: (code: string) =>
      request<void>(`/games/${code}`, { method: 'DELETE' }),
  },

  rounds: {
    add: (code: string, req: AddRoundRequest) =>
      request<Game>(`/games/${code}/rounds`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    edit: (code: string, roundNumber: number, handValues: Record<string, number>) =>
      request<Game>(`/games/${code}/rounds/${roundNumber}`, {
        method: 'PUT',
        body: JSON.stringify({ handValues }),
      }),
    undoLast: (code: string) =>
      request<Game>(`/games/${code}/rounds/last`, { method: 'DELETE' }),
  },

  spectators: {
    join: (code: string, playerId?: string) =>
      request<Spectator>(`/games/${code}/join`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      }),
    leave: (code: string, spectatorId: string) =>
      request<void>(`/games/${code}/spectators/me`, {
        method: 'DELETE',
        body: JSON.stringify({ spectatorId }),
      }),
  },

  stream: (code: string): EventSource => {
    return new EventSource(`${BASE}/games/${code}/stream`);
  },
};
