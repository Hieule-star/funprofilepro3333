-- Create daily_checkins table
CREATE TABLE public.daily_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  streak_count integer NOT NULL DEFAULT 1,
  bonus_awarded boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

-- Enable RLS
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own check-ins
CREATE POLICY "Users can view own check-ins"
  ON public.daily_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: System can insert check-ins (via RPC function)
CREATE POLICY "System can insert check-ins"
  ON public.daily_checkins
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_daily_checkins_user_date ON public.daily_checkins(user_id, checkin_date DESC);