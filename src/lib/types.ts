export interface StorageEnvelope {
  schemaVersion: number;
  knownPlayers: KnownPlayer[];
  games: Game[];
  appSettings: AppSettings;
}

export interface KnownPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Game {
  id: string;
  players: GamePlayer[];
  rounds: Round[];
  settings: GameSettings;
  status: 'in_progress' | 'completed' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  winnerId?: string;
}

export interface GamePlayer {
  knownPlayerId: string;
  name: string;
  avatar: string;
  color: string;
  eliminated: boolean;
  eliminatedAtRound?: number;
}

export interface Round {
  number: number;
  handValues: Record<string, number>;
  appliedScores: Record<string, number>;
  yanivCallerId: string;
  assafPlayerIds: string[];
  wasAssafed: boolean;
  halvingEvents: string[];
  eliminations: string[];
  timestamp: string;
}

export interface GameSettings {
  scoreLimit: number;
  yanivThreshold: number;
  halvingEnabled: boolean;
  halvingMultiple: number;
  assafEnabled: boolean;
  assafPenalty: number;
  tableTimerEnabled: boolean;
  tableTimerSeconds: number;
  jokersEnabled: boolean;
  variantName: string;
}

export interface AppSettings {
  defaultGameSettings: GameSettings;
  soundEnabled: boolean;
  soundVolume: number;
  theme: 'dark' | 'light';
}

export interface PlayerStats {
  knownPlayerId: string;
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
