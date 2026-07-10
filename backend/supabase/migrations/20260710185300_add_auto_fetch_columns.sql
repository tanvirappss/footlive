ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS auto_fetch_football boolean default false;
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS auto_fetch_cricket boolean default false;
