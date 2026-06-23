-- SQL Update script to add scorers columns to matches table
-- Run this in your Supabase SQL Editor to update your database.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_scorers text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_scorers text;
