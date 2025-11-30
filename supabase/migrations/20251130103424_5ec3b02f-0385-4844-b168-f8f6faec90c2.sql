-- Add INSERT policy for notifications table to allow authenticated users to create notifications
CREATE POLICY "Authenticated users can create notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (true);