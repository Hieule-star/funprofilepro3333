-- Enable full replica identity for realtime updates
ALTER TABLE posts REPLICA IDENTITY FULL;

-- Add posts table to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE posts;