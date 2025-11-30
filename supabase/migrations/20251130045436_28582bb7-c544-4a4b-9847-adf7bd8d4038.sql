-- Add media column to posts table to support multiple media files
ALTER TABLE posts ADD COLUMN media JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN posts.media IS 'Array of media objects with url and type properties: [{url: string, type: "image" | "video"}]';