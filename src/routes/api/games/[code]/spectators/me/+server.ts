import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGameByCode } from '$lib/server/queries/games';
import { leaveGame } from '$lib/server/queries/spectators';

export const DELETE: RequestHandler = async ({ params, request }) => {
  const { spectatorId } = await request.json();
  const game = await getGameByCode(params.code);
  if (!game) return json({ error: 'Game not found' }, { status: 404 });

  await leaveGame(params.code, game.id, spectatorId);
  return json({ ok: true });
};
