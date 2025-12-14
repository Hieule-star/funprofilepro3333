-- Create enum types for media
CREATE TYPE public.media_type AS ENUM ('image', 'video');
CREATE TYPE public.pin_status_type AS ENUM ('pending', 'pinning', 'pinned', 'failed', 'unpinned');

-- Create media_assets table for Hybrid Storage
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  
  -- File metadata
  type public.media_type NOT NULL,
  mime TEXT NOT NULL,
  size BIGINT NOT NULL,
  sha256 TEXT,
  original_filename TEXT,
  
  -- Cloudflare R2 storage
  r2_bucket TEXT,
  r2_key TEXT,
  r2_url TEXT,
  
  -- Cloudflare Stream (for video)
  stream_id TEXT,
  stream_playback_url TEXT,
  
  -- IPFS/Web3 storage
  ipfs_cid TEXT,
  ipfs_gateway_url TEXT,
  pin_provider TEXT,
  pin_status public.pin_status_type NOT NULL DEFAULT 'pending',
  pin_attempts INTEGER NOT NULL DEFAULT 0,
  last_pin_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_media_assets_owner ON public.media_assets(owner_id);
CREATE INDEX idx_media_assets_post ON public.media_assets(post_id);
CREATE INDEX idx_media_assets_pin_status ON public.media_assets(pin_status);
CREATE INDEX idx_media_assets_pending_pin ON public.media_assets(pin_status, pin_attempts) 
  WHERE pin_status = 'pending' AND pin_attempts < 5;

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Owner can insert their own media
CREATE POLICY "Users can insert own media" 
ON public.media_assets 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Owner can view their own media
CREATE POLICY "Users can view own media" 
ON public.media_assets 
FOR SELECT 
USING (auth.uid() = owner_id);

-- Public can view media linked to posts (posts are public)
CREATE POLICY "Public can view post media" 
ON public.media_assets 
FOR SELECT 
USING (
  post_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM public.posts WHERE posts.id = media_assets.post_id)
);

-- Owner can update their own media
CREATE POLICY "Users can update own media" 
ON public.media_assets 
FOR UPDATE 
USING (auth.uid() = owner_id);

-- Owner can delete their own media
CREATE POLICY "Users can delete own media" 
ON public.media_assets 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Admins can view all media
CREATE POLICY "Admins can view all media" 
ON public.media_assets 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- System can update pin status (for Edge Functions with service role)
CREATE POLICY "System can update media" 
ON public.media_assets 
FOR UPDATE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();