-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can create conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;

-- Create helper function with SECURITY DEFINER to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
END;
$$;

-- New SELECT policy for conversation_participants (no recursion)
CREATE POLICY "Users can view conversation participants" 
ON public.conversation_participants FOR SELECT 
USING (
  user_id = auth.uid() OR 
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- New INSERT policy for conversation_participants
-- Allow users to add themselves OR add others if they're already a participant
CREATE POLICY "Users can create conversation participants" 
ON public.conversation_participants FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- Fix conversations SELECT policy (use helper function)
CREATE POLICY "Users can view own conversations" 
ON public.conversations FOR SELECT 
USING (
  public.is_conversation_participant(id, auth.uid())
);

-- Allow users to create conversations
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);