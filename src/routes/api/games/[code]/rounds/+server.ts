import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addRound } from '$lib/server/queries/rounds';
import type { AddRoundRequest } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
  const req: AddRoundRequest = await request.json();
  if (!req.handValues || !req.yanivCallerId) {
    return json({ error: 'handValues and yanivCallerId are required' }, { status: 400 });
  }

  const game = await addRound(params.code, req);
  if (!game) return json({ error: 'Game not found or not in progress' }, { status: 404 });
  return json(game);
};
