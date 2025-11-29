-- 1. Allow content to be nullable in posts table
ALTER TABLE public.posts 
ALTER COLUMN content DROP NOT NULL;

-- 2. Add foreign key from notifications.actor_id to profiles.id
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Create token_watchlist table
CREATE TABLE public.token_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  price_alert_upper NUMERIC,
  price_alert_lower NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, token_symbol)
);

-- Enable RLS
ALTER TABLE public.token_watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for token_watchlist
CREATE POLICY "Users can view their own watchlist"
ON public.token_watchlist
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own watchlist items"
ON public.token_watchlist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist items"
ON public.token_watchlist
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items"
ON public.token_watchlist
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_token_watchlist_updated_at
BEFORE UPDATE ON public.token_watchlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();