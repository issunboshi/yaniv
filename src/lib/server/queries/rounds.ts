import { sql } from '../db';
import { calculateRoundScores, checkHalving, checkElimination, getRunningTotals } from '$lib/engine/scoring';
import { getGameByCode } from './games';
import { broadcast } from '../sse';
import type { Game, GameSettings, AddRoundRequest } from '$lib/types';

function getActivePlayers(game: Game): string[] {
  return game.players.filter(p => !p.eliminated).map(p => p.playerId);
}

export async function addRound(code: string, req: AddRoundRequest): Promise<Game | null> {
  const game = await getGameByCode(code);
  if (!game || game.status !== 'in_progress') return null;

  const settings = game.settings;
  const roundNumber = game.rounds.length + 1;

  let assafPlayerIds = req.assafPlayerIds ?? [];
  if (settings.autoAssaf && settings.assafEnabled) {
    const callerHandValue = req.handValues[req.yanivCallerId];
    assafPlayerIds = Object.entries(req.handValues)
      .filter(([pid, val]) => pid !== req.yanivCallerId && val <= callerHandValue)
      .map(([pid]) => pid);
  }

  const result = calculateRoundScores(req.handValues, req.yanivCallerId, assafPlayerIds, settings);

  const prevTotals = getRunningTotals(game.rounds);
  const halvingEvents: string[] = [];
  const eliminations: string[] = [];
  const finalScores = { ...result.appliedScores };
  const activePlayers = getActivePlayers(game);

  for (const pid of activePlayers) {
    if (finalScores[pid] === undefined) continue;
    const prevTotal = prevTotals[pid] ?? 0;
    let newTotal = prevTotal + finalScores[pid];

    if (finalScores[pid] > 0) {
      const halvedTotal = checkHalving(newTotal, settings);
      if (halvedTotal !== newTotal) {
        halvingEvents.push(pid);
        finalScores[pid] = halvedTotal - prevTotal;
        newTotal = halvedTotal;
      }
    }

    if (checkElimination(newTotal, settings)) {
      eliminations.push(pid);
    }
  }

  const [roundRow] = await sql`
    INSERT INTO rounds (game_id, round_number, yaniv_caller_id, was_assafed)
    VALUES (${game.id}, ${roundNumber}, ${req.yanivCallerId}, ${result.wasAssafed})
    RETURNING *
  `;

  for (const [pid, handValue] of Object.entries(req.handValues)) {
    await sql`
      INSERT INTO round_scores (round_id, player_id, hand_value, applied_score, was_assafer, was_halved, was_eliminated)
      VALUES (
        ${roundRow.id}, ${pid}, ${handValue}, ${finalScores[pid]},
        ${assafPlayerIds.includes(pid)}, ${halvingEvents.includes(pid)}, ${eliminations.includes(pid)}
      )
    `;
  }

  for (const pid of eliminations) {
    await sql`
      UPDATE game_players SET eliminated = true, eliminated_at_round = ${roundNumber}
      WHERE game_id = ${game.id} AND player_id = ${pid}
    `;
  }

  const remainingActive = activePlayers.filter(pid => !eliminations.includes(pid));
  const shouldEnd = remainingActive.length <= 1
    || (settings.endOnFirstElimination && eliminations.length > 0);
  if (shouldEnd) {
    const prevTotalsForWinner = getRunningTotals([...game.rounds, {
      id: '', roundNumber, handValues: req.handValues, appliedScores: finalScores,
      yanivCallerId: req.yanivCallerId, assafPlayerIds, wasAssafed: result.wasAssafed,
      halvingEvents, eliminations, createdAt: '',
    }]);
    const winnerId = remainingActive.length <= 1
      ? (remainingActive[0] ?? null)
      : remainingActive.reduce((best, pid) =>
          (prevTotalsForWinner[pid] ?? 0) < (prevTotalsForWinner[best] ?? 0) ? pid : best
        , remainingActive[0]);
    await sql`
      UPDATE games SET status = 'completed', winner_id = ${winnerId}, completed_at = now()
      WHERE id = ${game.id}
    `;
  }

  const updatedGame = await getGameByCode(code);
  if (updatedGame) {
    const newRound = updatedGame.rounds[updatedGame.rounds.length - 1];
    if (updatedGame.status === 'completed') {
      broadcast(code, { type: 'game_completed', game: updatedGame });
    } else {
      broadcast(code, { type: 'round_added', round: newRound, game: updatedGame });
    }
  }

  return updatedGame;
}

export async function editRound(code: string, roundNumber: number, newHandValues: Record<string, number>): Promise<Game | null> {
  const game = await getGameByCode(code);
  if (!game) return null;

  const roundInputs = game.rounds.map((r) => ({
    handValues: r.roundNumber === roundNumber ? newHandValues : r.handValues,
    yanivCallerId: r.yanivCallerId,
    assafPlayerIds: r.assafPlayerIds,
  }));

  await sql`DELETE FROM rounds WHERE game_id = ${game.id}`;
  await sql`UPDATE game_players SET eliminated = false, eliminated_at_round = NULL WHERE game_id = ${game.id}`;
  await sql`UPDATE games SET status = 'in_progress', winner_id = NULL, completed_at = NULL WHERE id = ${game.id}`;

  for (const input of roundInputs) {
    const currentGame = await getGameByCode(code);
    if (!currentGame || currentGame.status !== 'in_progress') break;
    await addRoundInternal(currentGame, input.handValues, input.yanivCallerId, input.assafPlayerIds);
  }

  const updatedGame = await getGameByCode(code);
  if (updatedGame) {
    broadcast(code, { type: 'round_edited', game: updatedGame });
  }
  return updatedGame;
}

async function addRoundInternal(
  game: Game,
  handValues: Record<string, number>,
  yanivCallerId: string,
  assafPlayerIds: string[]
): Promise<void> {
  const settings = game.settings;
  const roundNumber = game.rounds.length + 1;

  let effectiveAssafPlayerIds = assafPlayerIds;
  if (settings.autoAssaf && settings.assafEnabled) {
    const callerHandValue = handValues[yanivCallerId];
    effectiveAssafPlayerIds = Object.entries(handValues)
      .filter(([pid, val]) => pid !== yanivCallerId && val <= callerHandValue)
      .map(([pid]) => pid);
  }

  const result = calculateRoundScores(handValues, yanivCallerId, effectiveAssafPlayerIds, settings);

  const prevTotals = getRunningTotals(game.rounds);
  const halvingEvents: string[] = [];
  const eliminations: string[] = [];
  const finalScores = { ...result.appliedScores };
  const activePlayers = game.players.filter(p => !p.eliminated).map(p => p.playerId);

  for (const pid of activePlayers) {
    if (finalScores[pid] === undefined) continue;
    const prevTotal = prevTotals[pid] ?? 0;
    let newTotal = prevTotal + finalScores[pid];

    if (finalScores[pid] > 0) {
      const halvedTotal = checkHalving(newTotal, settings);
      if (halvedTotal !== newTotal) {
        halvingEvents.push(pid);
        finalScores[pid] = halvedTotal - prevTotal;
        newTotal = halvedTotal;
      }
    }

    if (checkElimination(newTotal, settings)) {
      eliminations.push(pid);
    }
  }

  const [roundRow] = await sql`
    INSERT INTO rounds (game_id, round_number, yaniv_caller_id, was_assafed)
    VALUES (${game.id}, ${roundNumber}, ${yanivCallerId}, ${result.wasAssafed})
    RETURNING *
  `;

  for (const [pid, handValue] of Object.entries(handValues)) {
    await sql`
      INSERT INTO round_scores (round_id, player_id, hand_value, applied_score, was_assafer, was_halved, was_eliminated)
      VALUES (
        ${roundRow.id}, ${pid}, ${handValue}, ${finalScores[pid]},
        ${effectiveAssafPlayerIds.includes(pid)}, ${halvingEvents.includes(pid)}, ${eliminations.includes(pid)}
      )
    `;
  }

  for (const pid of eliminations) {
    await sql`
      UPDATE game_players SET eliminated = true, eliminated_at_round = ${roundNumber}
      WHERE game_id = ${game.id} AND player_id = ${pid}
    `;
  }

  const remainingActive = activePlayers.filter(pid => !eliminations.includes(pid));
  const shouldEnd = remainingActive.length <= 1
    || (settings.endOnFirstElimination && eliminations.length > 0);
  if (shouldEnd) {
    const allTotals = getRunningTotals([...game.rounds, {
      id: '', roundNumber, handValues, appliedScores: finalScores,
      yanivCallerId, assafPlayerIds: effectiveAssafPlayerIds, wasAssafed: result.wasAssafed,
      halvingEvents, eliminations, createdAt: '',
    }]);
    const winnerId = remainingActive.length <= 1
      ? (remainingActive[0] ?? null)
      : remainingActive.reduce((best, pid) =>
          (allTotals[pid] ?? 0) < (allTotals[best] ?? 0) ? pid : best
        , remainingActive[0]);
    await sql`
      UPDATE games SET status = 'completed', winner_id = ${winnerId}, completed_at = now()
      WHERE id = ${game.id}
    `;
  }
}

export async function undoLastRound(code: string): Promise<Game | null> {
  const game = await getGameByCode(code);
  if (!game || game.rounds.length === 0) return null;

  const lastRound = game.rounds[game.rounds.length - 1];

  await sql`DELETE FROM rounds WHERE id = ${lastRound.id}`;

  for (const pid of lastRound.eliminations) {
    await sql`
      UPDATE game_players SET eliminated = false, eliminated_at_round = NULL
      WHERE game_id = ${game.id} AND player_id = ${pid}
    `;
  }

  if (game.status === 'completed') {
    await sql`
      UPDATE games SET status = 'in_progress', winner_id = NULL, completed_at = NULL
      WHERE id = ${game.id}
    `;
  }

  const updatedGame = await getGameByCode(code);
  if (updatedGame) {
    broadcast(code, { type: 'round_undone', game: updatedGame });
  }
  return updatedGame;
}
