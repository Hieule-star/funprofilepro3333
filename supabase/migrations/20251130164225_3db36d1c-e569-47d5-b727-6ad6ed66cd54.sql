-- Create claim_requests table
CREATE TABLE public.claim_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  amount_db bigint NOT NULL,
  amount_token numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  tx_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view own claim requests
CREATE POLICY "Users can view own claim requests"
  ON public.claim_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert own claim requests
CREATE POLICY "Users can insert own claim requests"
  ON public.claim_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: System can update claim requests
CREATE POLICY "System can update claim requests"
  ON public.claim_requests
  FOR UPDATE
  USING (true);

-- Create index for performance
CREATE INDEX idx_claim_requests_user_id ON public.claim_requests(user_id, created_at DESC);