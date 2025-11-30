-- Drop existing policies that use TO authenticated
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can create conversation participants" ON public.conversation_participants;

-- Recreate policies WITHOUT "TO authenticated" (defaults to public role)
-- This ensures policies work regardless of role type

CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own conversations" 
ON public.conversations FOR SELECT 
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Users can update conversations" 
ON public.conversations FOR UPDATE 
USING (public.is_conversation_participant(id, auth.uid()))
WITH CHECK (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Users can view conversation participants" 
ON public.conversation_participants FOR SELECT 
USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can create conversation participants" 
ON public.conversation_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id OR public.is_conversation_participant(conversation_id, auth.uid()));