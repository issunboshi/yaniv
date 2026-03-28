import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGameByCode } from '$lib/server/queries/games';
import { joinGame } from '$lib/server/queries/spectators';

export const POST: RequestHandler = async ({ params, request }) => {
  const { playerId } = await request.json();
  const game = await getGameByCode(params.code);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });

  const spectator = await joinGame(params.code, game.id, playerId);
  return json(spectator, { status: 201 });
};
