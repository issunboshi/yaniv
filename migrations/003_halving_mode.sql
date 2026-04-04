-- Add halving_mode option to games (halve or subtract)
ALTER TABLE games ADD COLUMN halving_mode text NOT NULL DEFAULT 'halve' CHECK (halving_mode IN ('halve', 'subtract'));
