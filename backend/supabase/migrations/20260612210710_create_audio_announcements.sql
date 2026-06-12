-- Create audio_announcements table
CREATE TABLE IF NOT EXISTS audio_announcements (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    audio_url text not null,
    play_at timestamptz not null,
    created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE audio_announcements ENABLE ROW LEVEL SECURITY;

-- Allow public read and write access because the site admin dashboard interacts anonymously
CREATE POLICY "Allow public read audio_announcements" ON audio_announcements FOR SELECT USING (true);
CREATE POLICY "Allow public insert audio_announcements" ON audio_announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update audio_announcements" ON audio_announcements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete audio_announcements" ON audio_announcements FOR DELETE USING (true);

-- Alter ticker_settings to add use_logo_image toggle column
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS use_logo_image boolean DEFAULT false;
