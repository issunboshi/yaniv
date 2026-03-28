import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { editRound } from '$lib/server/queries/rounds';

export const PUT: RequestHandler = async ({ params, request }) => {
  const { handValues } = await request.json();
  if (!handValues) return json({ error: 'handValues is required' }, { status: 400 });

  const roundNumber = parseInt(params.num);
  if (isNaN(roundNumber)) return json({ error: 'Invalid round number' }, { status: 400 });

  const game = await editRound(params.code, roundNumber, handValues);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });
  return json(game);
};
