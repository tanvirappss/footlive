-- SQL Update script to add scorers columns to matches table
-- Run this in your Supabase SQL Editor to update your database.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_scorers text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_scorers text;

-- Create live_score_keys table if not exists
CREATE TABLE IF NOT EXISTS live_score_keys (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    api_key text not null,
    provider text not null,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE live_score_keys ENABLE ROW LEVEL SECURITY;

-- Setup public read/write policies since admin dashboard uses anonymous client
DROP POLICY IF EXISTS "Allow public read live_score_keys" ON live_score_keys;
DROP POLICY IF EXISTS "Allow public insert live_score_keys" ON live_score_keys;
DROP POLICY IF EXISTS "Allow public update live_score_keys" ON live_score_keys;
DROP POLICY IF EXISTS "Allow public delete live_score_keys" ON live_score_keys;

CREATE POLICY "Allow public read live_score_keys" ON live_score_keys FOR SELECT USING (true);
CREATE POLICY "Allow public insert live_score_keys" ON live_score_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update live_score_keys" ON live_score_keys FOR UPDATE USING (true);
CREATE POLICY "Allow public delete live_score_keys" ON live_score_keys FOR DELETE USING (true);

-- Enable realtime for live_score_keys table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_score_keys;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;


ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS auto_fetch_football boolean default false;
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS auto_fetch_cricket boolean default false;
