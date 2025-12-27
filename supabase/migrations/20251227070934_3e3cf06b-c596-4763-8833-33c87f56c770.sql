-- Thêm enum type cho stream status
DO $$ BEGIN
  CREATE TYPE stream_status_type AS ENUM ('pending', 'processing', 'ready', 'error');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Thêm cột stream_status vào media_assets
ALTER TABLE media_assets 
ADD COLUMN IF NOT EXISTS stream_status stream_status_type DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN media_assets.stream_status IS 'Status of Cloudflare Stream processing: pending, processing, ready, error';