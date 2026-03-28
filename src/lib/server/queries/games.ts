import { sql } from '../db';
import { generateUniqueGameCode } from '../game-code';
import type { Game, GamePlayer, GameSettings, Round, CreateGameRequest } from '$lib/types';
import { findOrCreatePlayer } from './players';

function buildGameFromRows(
  gameRow: Record<string, unknown>,
  playerRows: Record<string, unknown>[],
  roundRows: Record<string, unknown>[],
  scoreRows: Record<string, unknown>[]
): Game {
  const settings: GameSettings = {
    scoreLimit: gameRow.score_limit as number,
    yanivThreshold: gameRow.yaniv_threshold as number,
    halvingEnabled: gameRow.halving_enabled as boolean,
    halvingMultiple: gameRow.halving_multiple as number,
    assafEnabled: gameRow.assaf_enabled as boolean,
    assafPenalty: gameRow.assaf_penalty as number,
    autoAssaf: gameRow.auto_assaf as boolean,
    jokersEnabled: gameRow.jokers_enabled as boolean,
    tableTimerEnabled: gameRow.timer_enabled as boolean,
    tableTimerSeconds: gameRow.timer_seconds as number,
    variantName: gameRow.variant_name as string,
  };

  const players: GamePlayer[] = playerRows.map((r) => ({
    playerId: r.player_id as string,
    name: r.player_name as string,
    avatar: r.avatar as string,
    color: r.color as string,
    displayOrder: r.display_order as number,
    eliminated: r.eliminated as boolean,
    eliminatedAtRound: r.eliminated_at_round as number | undefined,
  }));

  const scoresByRound = new Map<string, Record<string, unknown>[]>();
  for (const s of scoreRows) {
    const roundId = s.round_id as string;
    if (!scoresByRound.has(roundId)) scoresByRound.set(roundId, []);
    scoresByRound.get(roundId)!.push(s);
  }

  const rounds: Round[] = roundRows.map((r) => {
    const roundId = r.id as string;
    const scores = scoresByRound.get(roundId) ?? [];

    const handValues: Record<string, number> = {};
    const appliedScores: Record<string, number> = {};
    const assafPlayerIds: string[] = [];
    const halvingEvents: string[] = [];
    const eliminations: string[] = [];

    for (const s of scores) {
      const pid = s.player_id as string;
      handValues[pid] = s.hand_value as number;
      appliedScores[pid] = s.applied_score as number;
      if (s.was_assafer) assafPlayerIds.push(pid);
      if (s.was_halved) halvingEvents.push(pid);
      if (s.was_eliminated) eliminations.push(pid);
    }

    return {
      id: roundId,
      roundNumber: r.round_number as number,
      handValues,
      appliedScores,
      yanivCallerId: r.yaniv_caller_id as string,
      assafPlayerIds,
      wasAssafed: r.was_assafed as boolean,
      halvingEvents,
      eliminations,
      createdAt: (r.created_at as Date).toISOString(),
    };
  });

  return {
    id: gameRow.id as string,
    code: gameRow.code as string,
    players,
    rounds,
    settings,
    status: gameRow.status as Game['status'],
    createdBy: gameRow.created_by as string,
    winnerId: gameRow.winner_id as string | undefined,
    createdAt: (gameRow.created_at as Date).toISOString(),
    completedAt: gameRow.completed_at ? (gameRow.completed_at as Date).toISOString() : undefined,
  };
}

export async function createGame(req: CreateGameRequest): Promise<Game> {
  const code = await generateUniqueGameCode();

  const createdPlayers = [];
  let createdById = '';
  for (const p of req.players) {
    const player = await findOrCreatePlayer(p.name, p.avatar, p.color);
    createdPlayers.push(player);
    if (p.name.toLowerCase() === req.createdByName.toLowerCase()) {
      createdById = player.id;
    }
  }

  if (!createdById) createdById = createdPlayers[0].id;

  const s = req.settings;

  const [gameRow] = await sql`
    INSERT INTO games (
      code, variant_name, score_limit, yaniv_threshold,
      halving_enabled, halving_multiple, assaf_enabled, assaf_penalty, auto_assaf,
      jokers_enabled, timer_enabled, timer_seconds, created_by
    ) VALUES (
      ${code}, ${s.variantName}, ${s.scoreLimit}, ${s.yanivThreshold},
      ${s.halvingEnabled}, ${s.halvingMultiple}, ${s.assafEnabled}, ${s.assafPenalty}, ${s.autoAssaf},
      ${s.jokersEnabled}, ${s.tableTimerEnabled}, ${s.tableTimerSeconds}, ${createdById}
    )
    RETURNING *
  `;

  for (let i = 0; i < createdPlayers.length; i++) {
    await sql`
      INSERT INTO game_players (game_id, player_id, display_order)
      VALUES (${gameRow.id}, ${createdPlayers[i].id}, ${i})
    `;
  }

  return getGameByCode(code) as Promise<Game>;
}

export async function getGameByCode(code: string): Promise<Game | null> {
  const [gameRow] = await sql`SELECT * FROM games WHERE code = ${code}`;
  if (!gameRow) return null;

  const playerRows = await sql`
    SELECT gp.*, p.name AS player_name, p.avatar, p.color
    FROM game_players gp
    JOIN players p ON p.id = gp.player_id
    WHERE gp.game_id = ${gameRow.id}
    ORDER BY gp.display_order
  `;

  const roundRows = await sql`
    SELECT * FROM rounds WHERE game_id = ${gameRow.id} ORDER BY round_number
  `;

  const roundIds = roundRows.map((r) => r.id);
  const scoreRows = roundIds.length > 0
    ? await sql`SELECT * FROM round_scores WHERE round_id = ANY(${roundIds})`
    : [];

  return buildGameFromRows(gameRow, playerRows, roundRows, scoreRows);
}

export async function listGames(status?: string): Promise<Game[]> {
  const gameRows = status
    ? await sql`SELECT * FROM games WHERE status = ${status} ORDER BY created_at DESC`
    : await sql`SELECT * FROM games ORDER BY created_at DESC`;

  const games: Game[] = [];
  for (const gameRow of gameRows) {
    const playerRows = await sql`
      SELECT gp.*, p.name AS player_name, p.avatar, p.color
      FROM game_players gp
      JOIN players p ON p.id = gp.player_id
      WHERE gp.game_id = ${gameRow.id}
      ORDER BY gp.display_order
    `;
    const roundRows = await sql`SELECT * FROM rounds WHERE game_id = ${gameRow.id} ORDER BY round_number`;
    const roundIds = roundRows.map((r) => r.id);
    const scoreRows = roundIds.length > 0
      ? await sql`SELECT * FROM round_scores WHERE round_id = ANY(${roundIds})`
      : [];
    games.push(buildGameFromRows(gameRow, playerRows, roundRows, scoreRows));
  }
  return games;
}

export async function updateGameStatus(code: string, status: 'completed' | 'abandoned', winnerId?: string): Promise<Game | null> {
  await sql`
    UPDATE games
    SET status = ${status},
        winner_id = ${winnerId ?? null},
        completed_at = ${status !== 'in_progress' ? sql`now()` : null}
    WHERE code = ${code}
  `;
  return getGameByCode(code);
}

export async function deleteGame(code: string): Promise<boolean> {
  const result = await sql`DELETE FROM games WHERE code = ${code}`;
  return result.count > 0;
}
