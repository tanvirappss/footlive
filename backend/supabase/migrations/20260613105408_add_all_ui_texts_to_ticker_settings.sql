-- Migration: Add white-label UI text options to ticker_settings table
-- These allow customization of the ticker badge, subtitle, match tab labels, and empty placeholders.

ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS ticker_badge text DEFAULT '⚡ NEWS TICKER';
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS header_subtitle text DEFAULT 'Premium Streaming Portal';
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS tab_live_name text DEFAULT '🔴 Live Now';
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS tab_upcoming_name text DEFAULT '📅 Upcoming Fixtures';
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS tab_finished_name text DEFAULT '🏁 Finished Matches';
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS tab_channels_name text DEFAULT '📺 Live Channels';
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS no_streams_title text DEFAULT 'No Streams Configured';
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS no_streams_desc text DEFAULT 'There are no active video links bound to this match yet. Check back closer to game kickoff.';
