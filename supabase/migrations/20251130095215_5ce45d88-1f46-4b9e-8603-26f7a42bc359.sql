-- Add media support to messages table
ALTER TABLE messages 
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN messages.media_url IS 'URL of uploaded media file (image/video/document)';
COMMENT ON COLUMN messages.media_type IS 'Type of media: image, video, or document';
