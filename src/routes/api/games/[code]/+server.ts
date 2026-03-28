import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGameByCode, updateGameStatus, deleteGame } from '$lib/server/queries/games';
import { broadcast } from '$lib/server/sse';

export const GET: RequestHandler = async ({ params }) => {
  const game = await getGameByCode(params.code);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });
  return json(game);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const { status, winnerId } = await request.json();
  const game = await updateGameStatus(params.code, status, winnerId);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });

  if (status === 'abandoned') {
    broadcast(params.code, { type: 'game_abandoned', game });
  }
  return json(game);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const deleted = await deleteGame(params.code);
  if (!deleted) return json({ error: 'Game not found' }, { status: 404 });
  return json({ ok: true });
};
