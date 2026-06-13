-- Migration: Allow public write access to ad_networks table
-- This enables the unauthenticated admin dashboard client to save ad script configurations.

DROP POLICY IF EXISTS "Allow public insert ad_networks" ON ad_networks;
DROP POLICY IF EXISTS "Allow public update ad_networks" ON ad_networks;
DROP POLICY IF EXISTS "Allow public delete ad_networks" ON ad_networks;

CREATE POLICY "Allow public insert ad_networks" ON ad_networks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update ad_networks" ON ad_networks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete ad_networks" ON ad_networks FOR DELETE USING (true);
