-- Add is_online and last_seen columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();

-- Create calls table for call history tracking
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  status text NOT NULL DEFAULT 'calling',
  call_type text DEFAULT 'video',
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT valid_call_status CHECK (status IN ('calling', 'accepted', 'rejected', 'ended', 'missed')),
  CONSTRAINT valid_call_type CHECK (call_type IN ('video', 'audio'))
);

-- Enable RLS on calls table
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calls table
CREATE POLICY "Users can view own calls"
  ON public.calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update calls"
  ON public.calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable Realtime for calls table
ALTER TABLE public.calls REPLICA IDENTITY FULL;

-- Create index for faster queries
CREATE INDEX idx_calls_receiver_status ON public.calls(receiver_id, status);
CREATE INDEX idx_calls_caller_id ON public.calls(caller_id);

-- Add comment
COMMENT ON TABLE public.calls IS 'Stores video/audio call history and real-time call status';