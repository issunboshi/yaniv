import { sql } from '../db';
import type { Player } from '$lib/types';

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    name: row.name as string,
    avatar: row.avatar as string,
    color: row.color as string,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export async function findOrCreatePlayer(name: string, avatar: string, color: string): Promise<Player> {
  const [existing] = await sql`
    SELECT * FROM players WHERE lower(name) = lower(${name})
  `;

  if (existing) {
    const [updated] = await sql`
      UPDATE players SET avatar = ${avatar}, color = ${color}
      WHERE id = ${existing.id}
      RETURNING *
    `;
    return rowToPlayer(updated);
  }

  const [created] = await sql`
    INSERT INTO players (name, avatar, color)
    VALUES (${name}, ${avatar}, ${color})
    RETURNING *
  `;
  return rowToPlayer(created);
}

export async function listPlayers(): Promise<Player[]> {
  const rows = await sql`SELECT * FROM players ORDER BY name ASC`;
  return rows.map(rowToPlayer);
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const [row] = await sql`SELECT * FROM players WHERE id = ${id}`;
  return row ? rowToPlayer(row) : null;
}
