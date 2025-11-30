-- Add UPDATE policy for conversations table
CREATE POLICY "Users can update conversations"
ON public.conversations FOR UPDATE
USING (public.is_conversation_participant(id, auth.uid()))
WITH CHECK (public.is_conversation_participant(id, auth.uid()));