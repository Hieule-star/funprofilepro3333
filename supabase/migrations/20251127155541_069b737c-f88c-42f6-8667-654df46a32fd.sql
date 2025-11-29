-- Add comment_mention to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_mention';

-- Function to extract and notify mentioned users in comments
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  mentioned_username text;
  mentioned_user_id uuid;
  mention_pattern text := '@([a-zA-Z0-9_]+)';
BEGIN
  -- Extract all @mentions from the comment content
  FOR mentioned_username IN 
    SELECT unnest(regexp_matches(NEW.content, mention_pattern, 'g'))
  LOOP
    -- Get the user_id for this username
    SELECT id INTO mentioned_user_id
    FROM profiles
    WHERE username = mentioned_username;
    
    -- Create notification if user exists and is not the commenter themselves
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, comment_id, post_id)
      VALUES (mentioned_user_id, NEW.user_id, 'comment_mention', NEW.id, NEW.post_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new and updated comments
DROP TRIGGER IF EXISTS trigger_notify_comment_mentions ON comments;
CREATE TRIGGER trigger_notify_comment_mentions
AFTER INSERT OR UPDATE OF content ON comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment_mentions();