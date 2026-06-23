-- Enable public update access for matches to allow client-side score auto-updates
DROP POLICY IF EXISTS "Allow public update matches" ON matches;
CREATE POLICY "Allow public update matches" ON matches FOR UPDATE USING (true) WITH CHECK (true);
