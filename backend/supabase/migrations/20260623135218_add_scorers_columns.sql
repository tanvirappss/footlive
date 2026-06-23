-- Add home_scorers and away_scorers columns to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_scorers text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_scorers text;
