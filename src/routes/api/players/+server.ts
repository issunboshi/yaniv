import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listPlayers, findOrCreatePlayer } from '$lib/server/queries/players';

export const GET: RequestHandler = async () => {
  const players = await listPlayers();
  return json(players);
};

export const POST: RequestHandler = async ({ request }) => {
  const { name, avatar, color } = await request.json();
  if (!name) return json({ error: 'Name is required' }, { status: 400 });

  const player = await findOrCreatePlayer(name, avatar ?? '🃏', color ?? '#e74c3c');
  return json(player, { status: 201 });
};
