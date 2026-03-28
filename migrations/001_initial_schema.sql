-- Yaniv Score Tracker — Initial Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '🃏',
  color text NOT NULL DEFAULT '#e74c3c',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX players_name_unique ON players (lower(name));

CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  variant_name text NOT NULL DEFAULT 'Classic',
  score_limit int NOT NULL DEFAULT 200,
  yaniv_threshold int NOT NULL DEFAULT 5,
  halving_enabled bool NOT NULL DEFAULT true,
  halving_multiple int NOT NULL DEFAULT 50,
  assaf_enabled bool NOT NULL DEFAULT true,
  assaf_penalty int NOT NULL DEFAULT 30,
  auto_assaf bool NOT NULL DEFAULT false,
  jokers_enabled bool NOT NULL DEFAULT true,
  timer_enabled bool NOT NULL DEFAULT false,
  timer_seconds int NOT NULL DEFAULT 60,
  created_by uuid NOT NULL REFERENCES players(id),
  winner_id uuid REFERENCES players(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id),
  display_order int NOT NULL,
  eliminated bool NOT NULL DEFAULT false,
  eliminated_at_round int,
  CONSTRAINT game_players_unique UNIQUE (game_id, player_id)
);

CREATE TABLE rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  yaniv_caller_id uuid NOT NULL REFERENCES players(id),
  was_assafed bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rounds_unique UNIQUE (game_id, round_number)
);

CREATE TABLE round_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id),
  hand_value int NOT NULL,
  applied_score int NOT NULL,
  was_assafer bool NOT NULL DEFAULT false,
  was_halved bool NOT NULL DEFAULT false,
  was_eliminated bool NOT NULL DEFAULT false,
  CONSTRAINT round_scores_unique UNIQUE (round_id, player_id)
);

CREATE TABLE game_spectators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id),
  connected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_games_code ON games(code);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_rounds_game ON rounds(game_id);
CREATE INDEX idx_round_scores_round ON round_scores(round_id);
CREATE INDEX idx_game_spectators_game ON game_spectators(game_id);
