-- Create composite index for event_name and created_at on analytics table
CREATE INDEX IF NOT EXISTS idx_analytics_event_created ON analytics(event_name, created_at);

-- Create RPC function to get active viewers count
CREATE OR REPLACE FUNCTION get_active_viewers_count()
RETURNS integer SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT count(distinct session_id)::integer
    FROM analytics
    WHERE event_name = 'web_watch_stream'
      AND created_at >= (now() - interval '5 minutes')
  );
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to get total views count
CREATE OR REPLACE FUNCTION get_total_views_count()
RETURNS integer SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT count(*)::integer
    FROM analytics
  );
END;
$$ LANGUAGE plpgsql;
