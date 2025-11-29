-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('comment_like', 'comment_reply', 'post_like');

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to create notification for comment like
CREATE OR REPLACE FUNCTION public.notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_owner_id uuid;
BEGIN
  -- Get the comment owner
  SELECT user_id INTO comment_owner_id
  FROM comments
  WHERE id = NEW.comment_id;

  -- Don't notify if user likes their own comment
  IF comment_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, comment_id)
    VALUES (comment_owner_id, NEW.user_id, 'comment_like', NEW.comment_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Function to create notification for comment reply
CREATE OR REPLACE FUNCTION public.notify_comment_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_comment_owner_id uuid;
BEGIN
  -- Only create notification if this is a reply (has parent_comment_id)
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Get the parent comment owner
    SELECT user_id INTO parent_comment_owner_id
    FROM comments
    WHERE id = NEW.parent_comment_id;

    -- Don't notify if user replies to their own comment
    IF parent_comment_owner_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, comment_id, post_id)
      VALUES (parent_comment_owner_id, NEW.user_id, 'comment_reply', NEW.id, NEW.post_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_notify_comment_like
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment_like();

CREATE TRIGGER trigger_notify_comment_reply
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment_reply();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;