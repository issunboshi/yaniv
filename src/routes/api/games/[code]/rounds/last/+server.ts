import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { undoLastRound } from '$lib/server/queries/rounds';

export const DELETE: RequestHandler = async ({ params }) => {
  const game = await undoLastRound(params.code);
  if (!game) return json({ error: 'Game not found or no rounds to undo' }, { status: 404 });
  return json(game);
};
