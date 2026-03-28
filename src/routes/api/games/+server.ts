import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listGames, createGame } from '$lib/server/queries/games';
import type { CreateGameRequest } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
  const status = url.searchParams.get('status') ?? undefined;
  const games = await listGames(status);
  return json(games);
};

export const POST: RequestHandler = async ({ request }) => {
  const req: CreateGameRequest = await request.json();
  if (!req.players || req.players.length < 2) {
    return json({ error: 'At least 2 players required' }, { status: 400 });
  }
  const game = await createGame(req);
  return json(game, { status: 201 });
};
