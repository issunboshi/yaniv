export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  createdAt: string;
}

export interface Game {
  id: string;
  code: string;
  players: GamePlayer[];
  rounds: Round[];
  settings: GameSettings;
  status: 'in_progress' | 'completed' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  winnerId?: string;
  createdBy: string;
}

export interface GamePlayer {
  playerId: string;
  name: string;
  avatar: string;
  color: string;
  eliminated: boolean;
  eliminatedAtRound?: number;
  displayOrder: number;
}

export interface Round {
  id: string;
  roundNumber: number;
  handValues: Record<string, number>;
  appliedScores: Record<string, number>;
  yanivCallerId: string;
  assafPlayerIds: string[];
  wasAssafed: boolean;
  halvingEvents: string[];
  eliminations: string[];
  createdAt: string;
}

export interface GameSettings {
  scoreLimit: number;
  yanivThreshold: number;
  halvingEnabled: boolean;
  halvingMultiple: number;
  assafEnabled: boolean;
  assafPenalty: number;
  autoAssaf: boolean;
  tableTimerEnabled: boolean;
  tableTimerSeconds: number;
  jokersEnabled: boolean;
  endOnFirstElimination: boolean;
  variantName: string;
}

export interface AppSettings {
  defaultGameSettings: GameSettings;
  soundEnabled: boolean;
  soundVolume: number;
  theme: 'dark' | 'light';
}

export interface PlayerStats {
  playerId: string;
  name: string;
  avatar: string;
  gamesPlayed: number;
  wins: number;
  yanivCalls: number;
  successfulYanivs: number;
  timesAssafed: number;
  timesPerformedAssaf: number;
  averageFinalScore: number;
  halvingEvents: number;
  bestComeback: number;
}

export interface Spectator {
  id: string;
  playerId?: string;
  playerName?: string;
  connectedAt: string;
}

export type GameEvent =
  | { type: 'round_added'; round: Round; game: Game }
  | { type: 'round_edited'; game: Game }
  | { type: 'round_undone'; game: Game }
  | { type: 'game_completed'; game: Game }
  | { type: 'game_abandoned'; game: Game }
  | { type: 'spectator_joined'; spectator: Spectator }
  | { type: 'spectator_left'; spectatorId: string };

export interface CreateGameRequest {
  players: { name: string; avatar: string; color: string }[];
  settings: GameSettings;
  createdByName: string;
}

export interface AddRoundRequest {
  handValues: Record<string, number>;
  yanivCallerId: string;
  assafPlayerIds?: string[];
}

export interface EditRoundRequest {
  handValues: Record<string, number>;
}

export interface JoinGameRequest {
  playerId?: string;
}
