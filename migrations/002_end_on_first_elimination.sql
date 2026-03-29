-- Add end_on_first_elimination option to games
ALTER TABLE games ADD COLUMN end_on_first_elimination bool NOT NULL DEFAULT false;
