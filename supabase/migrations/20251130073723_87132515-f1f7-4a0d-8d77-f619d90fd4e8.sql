-- Drop ALL existing policies for conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON public.conversations;

-- Drop ALL existing policies for conversation_participants
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can create conversation participants" ON public.conversation_participants;

-- Recreate function with SECURITY DEFINER
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

-- Recreate ALL policies for conversations (PERMISSIVE with TO authenticated)
CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view own conversations" 
ON public.conversations FOR SELECT 
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Users can update conversations" 
ON public.conversations FOR UPDATE 
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()))
WITH CHECK (public.is_conversation_participant(id, auth.uid()));

-- Recreate ALL policies for conversation_participants (PERMISSIVE with TO authenticated)
CREATE POLICY "Users can view conversation participants" 
ON public.conversation_participants FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can create conversation participants" 
ON public.conversation_participants FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_conversation_participant(conversation_id, auth.uid()));