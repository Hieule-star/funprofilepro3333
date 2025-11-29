-- Create enum for blockchain networks
CREATE TYPE public.blockchain_network AS ENUM ('bnb', 'ethereum', 'bitcoin');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('send', 'receive', 'swap');

-- Create wallets table to store user wallet addresses
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain public.blockchain_network NOT NULL,
  address TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, chain, address)
);

-- Create custom_tokens table for BEP-20 tokens
CREATE TABLE public.custom_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_address TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  logo_url TEXT,
  chain public.blockchain_network NOT NULL DEFAULT 'bnb',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, contract_address, chain)
);

-- Create transactions table to cache transaction history
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain public.blockchain_network NOT NULL,
  tx_hash TEXT NOT NULL,
  type public.transaction_type NOT NULL,
  amount TEXT NOT NULL,
  token_address TEXT,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tx_hash, chain)
);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets table
CREATE POLICY "Users can view their own wallets"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets"
  ON public.wallets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for custom_tokens table
CREATE POLICY "Users can view their own tokens"
  ON public.custom_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON public.custom_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.custom_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for transactions table
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger for wallets
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_custom_tokens_user_id ON public.custom_tokens(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_chain ON public.transactions(chain);
CREATE INDEX idx_transactions_timestamp ON public.transactions(timestamp DESC);