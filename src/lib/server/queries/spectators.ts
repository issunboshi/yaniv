import { sql } from '../db';
import { broadcast } from '../sse';
import type { Spectator } from '$lib/types';

function rowToSpectator(row: Record<string, unknown>): Spectator {
  return {
    id: row.id as string,
    playerId: row.player_id as string | undefined,
    playerName: row.player_name as string | undefined,
    connectedAt: (row.connected_at as Date).toISOString(),
  };
}

export async function joinGame(gameCode: string, gameId: string, playerId?: string): Promise<Spectator> {
  if (playerId) {
    await sql`
      DELETE FROM game_spectators
      WHERE game_id = ${gameId} AND player_id = ${playerId}
    `;
  }

  const [row] = await sql`
    INSERT INTO game_spectators (game_id, player_id)
    VALUES (${gameId}, ${playerId ?? null})
    RETURNING *, NULL AS player_name
  `;

  let spectator = rowToSpectator(row);
  if (playerId) {
    const [player] = await sql`SELECT name FROM players WHERE id = ${playerId}`;
    if (player) spectator = { ...spectator, playerName: player.name as string };
  }

  broadcast(gameCode, { type: 'spectator_joined', spectator });
  return spectator;
}

export async function leaveGame(gameCode: string, gameId: string, spectatorId: string): Promise<void> {
  await sql`DELETE FROM game_spectators WHERE id = ${spectatorId} AND game_id = ${gameId}`;
  broadcast(gameCode, { type: 'spectator_left', spectatorId });
}

export async function listSpectators(gameId: string): Promise<Spectator[]> {
  const rows = await sql`
    SELECT gs.*, p.name AS player_name
    FROM game_spectators gs
    LEFT JOIN players p ON p.id = gs.player_id
    WHERE gs.game_id = ${gameId}
    ORDER BY gs.connected_at
  `;
  return rows.map(rowToSpectator);
}

export async function clearSpectators(gameId: string): Promise<void> {
  await sql`DELETE FROM game_spectators WHERE game_id = ${gameId}`;
}
