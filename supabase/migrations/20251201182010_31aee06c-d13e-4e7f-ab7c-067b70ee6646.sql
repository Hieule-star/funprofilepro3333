-- Create function to generate reward notifications
CREATE OR REPLACE FUNCTION public.create_reward_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
  emoji TEXT;
BEGIN
  -- Skip initial_calculation type
  IF NEW.reward_type = 'initial_calculation' THEN
    RETURN NEW;
  END IF;

  -- Set emoji and title based on reward type
  CASE NEW.reward_type
    WHEN 'registration' THEN
      emoji := '🎉';
      notification_title := 'Chào mừng bạn!';
    WHEN 'post' THEN
      emoji := '📝';
      notification_title := 'Thưởng đăng bài';
    WHEN 'comment' THEN
      emoji := '💬';
      notification_title := 'Thưởng bình luận';
    WHEN 'like' THEN
      emoji := '❤️';
      notification_title := 'Thưởng tương tác';
    WHEN 'friend' THEN
      emoji := '👥';
      notification_title := 'Thưởng kết bạn';
    WHEN 'game' THEN
      emoji := '🎮';
      notification_title := 'Thưởng chơi game';
    WHEN 'daily_checkin' THEN
      emoji := '📅';
      notification_title := 'Thưởng điểm danh';
    ELSE
      emoji := '🎁';
      notification_title := 'Phần thưởng';
  END CASE;

  -- Format message with amount
  notification_message := emoji || ' +' || TO_CHAR(NEW.amount, 'FM999,999,999') || ' CAMLY - ' || COALESCE(NEW.description, notification_title);

  -- Set link based on reward type
  CASE NEW.reward_type
    WHEN 'post' THEN notification_link := '/';
    WHEN 'game' THEN notification_link := '/game';
    WHEN 'friend' THEN notification_link := '/friends';
    ELSE notification_link := '/profile';
  END CASE;

  -- Insert notification
  INSERT INTO public.notifications (user_id, type, title, message, read, link)
  VALUES (NEW.user_id, 'reward', notification_title, notification_message, false, notification_link);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on reward_transactions table
DROP TRIGGER IF EXISTS on_reward_transaction_insert ON public.reward_transactions;
CREATE TRIGGER on_reward_transaction_insert
  AFTER INSERT ON public.reward_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_reward_notification();