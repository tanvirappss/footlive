-- Migration: Add no_matches_title and no_matches_desc to ticker_settings table
-- These columns allow editing the text displayed in the "No Matches Broadcasts" empty state box.

ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS no_matches_title text DEFAULT 'NO MATCHES BROADCASTS';
ALTER TABLE ticker_settings ADD COLUMN IF NOT EXISTS no_matches_desc text DEFAULT 'There are no active matches in this tab. Tune in during kickoff schedules.';
