import type { Game, PlayerStats } from '$lib/types';

export interface GlobalStats {
  totalGames: number;
  totalRounds: number;
  mostCommonWinner: { name: string; wins: number } | null;
  longestGame: number;
}

export function derivePlayerStats(games: Game[]): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  for (const game of games) {
    if (game.status === 'abandoned') continue;

    for (const player of game.players) {
      if (!statsMap.has(player.playerId)) {
        statsMap.set(player.playerId, {
          playerId: player.playerId,
          name: player.name,
          avatar: player.avatar,
          gamesPlayed: 0,
          wins: 0,
          yanivCalls: 0,
          successfulYanivs: 0,
          timesAssafed: 0,
          timesPerformedAssaf: 0,
          averageFinalScore: 0,
          halvingEvents: 0,
          bestComeback: 0,
        });
      }

      const stat = statsMap.get(player.playerId)!;
      stat.name = player.name;
      stat.avatar = player.avatar;
      stat.gamesPlayed++;

      if (game.winnerId === player.playerId) {
        stat.wins++;
      }

      for (const round of game.rounds) {
        if (round.yanivCallerId === player.playerId) {
          stat.yanivCalls++;
          if (!round.wasAssafed) {
            stat.successfulYanivs++;
          } else {
            stat.timesAssafed++;
          }
        }
        if (round.assafPlayerIds.includes(player.playerId)) {
          stat.timesPerformedAssaf++;
        }
        if (round.halvingEvents.includes(player.playerId)) {
          stat.halvingEvents++;
          const recovery = -(round.appliedScores[player.playerId] ?? 0);
          if (recovery > stat.bestComeback) {
            stat.bestComeback = recovery;
          }
        }
      }
    }
  }

  // Calculate average final scores
  for (const stat of statsMap.values()) {
    if (stat.gamesPlayed > 0) {
      let totalFinalScore = 0;
      let counted = 0;
      for (const game of games) {
        if (game.status === 'abandoned') continue;
        const player = game.players.find(p => p.playerId === stat.playerId);
        if (!player) continue;
        let score = 0;
        for (const round of game.rounds) {
          score += round.appliedScores[player.playerId] ?? 0;
        }
        totalFinalScore += score;
        counted++;
      }
      stat.averageFinalScore = counted > 0 ? Math.round(totalFinalScore / counted) : 0;
    }
  }

  return Array.from(statsMap.values());
}

export function deriveGlobalStats(games: Game[]): GlobalStats {
  const completed = games.filter(g => g.status === 'completed');
  const totalRounds = completed.reduce((sum, g) => sum + g.rounds.length, 0);

  const winCounts = new Map<string, { name: string; wins: number }>();
  for (const game of completed) {
    if (!game.winnerId) continue;
    const winner = game.players.find(p => p.playerId === game.winnerId);
    if (!winner) continue;
    const entry = winCounts.get(game.winnerId) ?? { name: winner.name, wins: 0 };
    entry.wins++;
    winCounts.set(game.winnerId, entry);
  }

  let mostCommonWinner: { name: string; wins: number } | null = null;
  for (const entry of winCounts.values()) {
    if (!mostCommonWinner || entry.wins > mostCommonWinner.wins) {
      mostCommonWinner = entry;
    }
  }

  const longestGame = completed.reduce((max, g) => Math.max(max, g.rounds.length), 0);

  return { totalGames: completed.length, totalRounds, mostCommonWinner, longestGame };
}
