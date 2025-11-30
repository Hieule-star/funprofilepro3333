-- Create function to handle conversation creation with participants
CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(
  current_user_id uuid,
  friend_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conv_id uuid;
  new_conv_id uuid;
BEGIN
  -- Check if conversation already exists between these users
  SELECT c.id INTO existing_conv_id
  FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = friend_id
  )
  LIMIT 1;

  -- If conversation exists, return its ID
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (id, created_at, updated_at)
  VALUES (gen_random_uuid(), now(), now())
  RETURNING id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conv_id, current_user_id),
    (new_conv_id, friend_id);

  RETURN new_conv_id;
END;
$$;