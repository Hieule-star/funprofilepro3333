-- Create token watchlist table
CREATE TABLE public.token_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_symbol text NOT NULL,
  token_name text,
  price_alert_upper numeric,
  price_alert_lower numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, token_symbol)
);

-- Enable RLS
ALTER TABLE public.token_watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own watchlist"
  ON public.token_watchlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist items"
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

-- Trigger for updated_at
CREATE TRIGGER update_token_watchlist_updated_at
  BEFORE UPDATE ON public.token_watchlist
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();