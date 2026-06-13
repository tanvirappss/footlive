-- schema.sql
-- Premium World Cup 2026 Football Streaming Application Schema

-- Create custom schema extensions if needed
create extension if not exists "uuid-ossp";

-- 1. Teams Table
create table if not exists teams (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    short_name text not null,
    country_name text not null,
    country_code text not null,
    flag_url text,
    logo_url text,
    region text, -- e.g., UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC
    is_enabled boolean default true,
    created_at timestamptz default now()
);

-- 2. Matches Table
create table if not exists matches (
    id uuid primary key default gen_random_uuid(),
    home_team_id uuid references teams(id) on delete set null,
    away_team_id uuid references teams(id) on delete set null,
    home_team_custom_name text,
    home_team_custom_flag text,
    home_team_custom_logo text,
    away_team_custom_name text,
    away_team_custom_flag text,
    away_team_custom_logo text,
    tournament_name text not null default 'FIFA World Cup 2026',
    match_date date not null,
    match_time time not null,
    match_timestamp timestamptz not null,
    stadium_name text not null,
    status text not null default 'upcoming', -- 'upcoming', 'live', 'half_time', 'finished', 'postponed', 'cancelled'
    banner_url text,
    description text, -- rich text description
    home_score integer default 0,
    away_score integer default 0,
    created_at timestamptz default now()
);

-- 3. Streams Table
create table if not exists streams (
    id uuid primary key default gen_random_uuid(),
    match_id uuid references matches(id) on delete cascade,
    stream_name text not null,
    primary_url text not null,
    backup_url_1 text,
    backup_url_2 text,
    backup_url_3 text,
    is_enabled boolean default true,
    created_at timestamptz default now()
);

-- 4. Announcements Table
create table if not exists announcements (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    message text not null,
    icon text,
    priority text not null default 'medium', -- 'low', 'medium', 'high'
    status text not null default 'published', -- 'draft', 'published', 'scheduled'
    scheduled_for timestamptz,
    created_at timestamptz default now()
);

-- 5. Ad Networks / Earnings Table
create table if not exists ad_networks (
    id uuid primary key default gen_random_uuid(),
    network_name text not null unique,
    is_enabled boolean default true,
    verification_code text,
    header_script text,
    footer_script text,
    banner_script text,
    native_script text,
    social_bar_script text,
    popunder_script text,
    custom_scripts jsonb,
    created_at timestamptz default now()
);

-- 6. App Updates Table
create table if not exists app_updates (
    id uuid primary key default gen_random_uuid(),
    version_code integer not null unique,
    version_name text not null,
    title text not null,
    message text not null,
    update_type text not null default 'none', -- 'force', 'flexible', 'none'
    apk_url text,
    created_at timestamptz default now()
);

-- 7. Analytics Table
create table if not exists analytics (
    id uuid primary key default gen_random_uuid(),
    event_name text not null,
    metadata jsonb,
    session_id text,
    created_at timestamptz default now()
);

-- 8. Ticker & Site Settings Table
create table if not exists ticker_settings (
    id uuid primary key default gen_random_uuid(),
    ticker_text text,
    is_enabled boolean default true,
    site_name text default 'WORLD CUP 2026',
    logo_url text,
    banner_url text,
    show_counters boolean default true,
    views_offset integer default 0,
    viewers_offset integer default 0,
    audio_url text,
    audio_enabled boolean default true,
    default_streams jsonb default '[]'::jsonb,
    meta_title text,
    meta_description text,
    meta_image text,
    use_logo_image boolean default false,
    no_matches_title text default 'NO MATCHES BROADCASTS',
    no_matches_desc text default 'There are no active matches in this tab. Tune in during kickoff schedules.',
    ticker_badge text default '⚡ NEWS TICKER',
    header_subtitle text default 'Premium Streaming Portal',
    tab_live_name text default '🔴 Live Now',
    tab_upcoming_name text default '📅 Upcoming Fixtures',
    tab_finished_name text default '🏁 Finished Matches',
    tab_channels_name text default '📺 Live Channels',
    no_streams_title text default 'No Streams Configured',
    no_streams_desc text default 'There are no active video links bound to this match yet. Check back closer to game kickoff.',
    updated_at timestamptz default now(),
    created_at timestamptz default now()
);

-- Indexing for performance
create index if not exists idx_matches_timestamp on matches(match_timestamp);
create index if not exists idx_matches_status on matches(status);
create index if not exists idx_streams_match_id on streams(match_id);
create index if not exists idx_analytics_event on analytics(event_name);

-- Enable Row Level Security (RLS)
alter table teams enable row level security;
alter table matches enable row level security;
alter table streams enable row level security;
alter table announcements enable row level security;
alter table ad_networks enable row level security;
alter table app_updates enable row level security;
alter table analytics enable row level security;
alter table ticker_settings enable row level security;

-- drop existing policies if they exist to prevent errors
drop policy if exists "Allow public read teams" on teams;
drop policy if exists "Allow public read matches" on matches;
drop policy if exists "Allow public read streams" on streams;
drop policy if exists "Allow public read announcements" on announcements;
drop policy if exists "Allow public read ad_networks" on ad_networks;
drop policy if exists "Allow public read app_updates" on app_updates;
drop policy if exists "Allow public insert analytics" on analytics;
drop policy if exists "Allow public read ticker_settings" on ticker_settings;

drop policy if exists "Allow admin write teams" on teams;
drop policy if exists "Allow admin write matches" on matches;
drop policy if exists "Allow admin write streams" on streams;
drop policy if exists "Allow admin write announcements" on announcements;
drop policy if exists "Allow admin write ad_networks" on ad_networks;
drop policy if exists "Allow admin write app_updates" on app_updates;
drop policy if exists "Allow admin read write analytics" on analytics;

-- Policies for public (anon) read-only access
create policy "Allow public read teams" on teams for select using (true);
create policy "Allow public read matches" on matches for select using (true);
create policy "Allow public read streams" on streams for select using (true);
create policy "Allow public read announcements" on announcements for select using (true);
create policy "Allow public read ad_networks" on ad_networks for select using (true);
create policy "Allow public read app_updates" on app_updates for select using (true);
create policy "Allow public read ticker_settings" on ticker_settings for select using (true);

-- Policies for public insert analytics
create policy "Allow public insert analytics" on analytics for insert with check (true);

-- Policies for public write access to settings (since admin dashboard uses anon client)
create policy "Allow public insert ticker_settings" on ticker_settings for insert with check (true);
create policy "Allow public update ticker_settings" on ticker_settings for update using (true);
create policy "Allow public delete ticker_settings" on ticker_settings for delete using (true);

-- Policies for public write access to ad_networks (since admin dashboard uses anon client)
create policy "Allow public insert ad_networks" on ad_networks for insert with check (true);
create policy "Allow public update ad_networks" on ad_networks for update using (true);
create policy "Allow public delete ad_networks" on ad_networks for delete using (true);

-- Policies for authenticated admin write access
create policy "Allow admin write teams" on teams for all to authenticated using (true) with check (true);
create policy "Allow admin write matches" on matches for all to authenticated using (true) with check (true);
create policy "Allow admin write streams" on streams for all to authenticated using (true) with check (true);
create policy "Allow admin write announcements" on announcements for all to authenticated using (true) with check (true);
create policy "Allow admin write ad_networks" on ad_networks for all to authenticated using (true) with check (true);
create policy "Allow admin write app_updates" on app_updates for all to authenticated using (true) with check (true);
create policy "Allow admin read write analytics" on analytics for all to authenticated using (true) with check (true);

-- Realtime publication setup
-- First recreate publication if needed or handle enabling
begin;
  -- Remove tables from supabase_realtime if they are already added, to prevent errors
  -- (If publication doesn't exist, it will fail silently or we can ignore it)
commit;

-- Enable realtime for tables
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table streams;
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table ad_networks;
alter publication supabase_realtime add table app_updates;
alter publication supabase_realtime add table ticker_settings;
