-- Create game_rooms table for multiplayer games
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL, -- 'gomoku', 'tictactoe', 'memory'
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  current_turn UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  game_state JSONB DEFAULT '{}', -- store board state, scores, etc.
  is_private BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_room_players table
CREATE TABLE public.game_room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_symbol TEXT, -- 'X', 'O' for tictactoe/gomoku, 'player1', 'player2' for memory
  score INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_room_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_rooms
CREATE POLICY "Anyone can view game rooms"
ON public.game_rooms FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create rooms"
ON public.game_rooms FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creator or players can update"
ON public.game_rooms FOR UPDATE
USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM public.game_room_players WHERE room_id = id AND user_id = auth.uid())
);

CREATE POLICY "Room creator can delete"
ON public.game_rooms FOR DELETE
USING (auth.uid() = created_by);

-- RLS policies for game_room_players
CREATE POLICY "Anyone can view room players"
ON public.game_room_players FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join rooms"
ON public.game_room_players FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update their own record"
ON public.game_room_players FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Players can leave rooms"
ON public.game_room_players FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.game_room_players REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_room_players;

-- Create function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 6));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite code for private rooms
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_private = true AND NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invite_code
BEFORE INSERT ON public.game_rooms
FOR EACH ROW
EXECUTE FUNCTION set_invite_code();

-- Trigger to update updated_at
CREATE TRIGGER update_game_rooms_updated_at
BEFORE UPDATE ON public.game_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();