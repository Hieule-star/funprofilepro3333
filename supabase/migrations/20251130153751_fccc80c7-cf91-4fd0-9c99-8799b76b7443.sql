-- Create user_rewards table to store CAMLY balance
CREATE TABLE public.user_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  camly_balance BIGINT NOT NULL DEFAULT 0,
  total_earned BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_rewards
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_rewards
CREATE POLICY "Users can view own rewards"
  ON public.user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all rewards for leaderboard"
  ON public.user_rewards FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own rewards"
  ON public.user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create reward_transactions table to log all transactions
CREATE TABLE public.reward_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  reward_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reward_transactions
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for reward_transactions
CREATE POLICY "Users can view own transactions"
  ON public.reward_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.reward_transactions FOR INSERT
  WITH CHECK (true);

-- Create function to add reward
CREATE OR REPLACE FUNCTION public.add_reward(
  p_user_id UUID,
  p_amount BIGINT,
  p_reward_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user_rewards
  INSERT INTO public.user_rewards (user_id, camly_balance, total_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    camly_balance = public.user_rewards.camly_balance + p_amount,
    total_earned = public.user_rewards.total_earned + p_amount,
    updated_at = now();

  -- Log transaction
  INSERT INTO public.reward_transactions (user_id, amount, reward_type, reference_id, description)
  VALUES (p_user_id, p_amount, p_reward_type, p_reference_id, p_description);
END;
$$;

-- Trigger function for new user registration
CREATE OR REPLACE FUNCTION public.reward_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM add_reward(NEW.id, 50000, 'registration', NEW.id, 'Chào mừng bạn đến với Fun Profile!');
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_user_registered
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_new_user();

-- Trigger function for new post
CREATE OR REPLACE FUNCTION public.reward_new_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_amount BIGINT;
BEGIN
  -- 15000 if has media, 10000 if text only
  IF NEW.media IS NOT NULL AND jsonb_array_length(NEW.media) > 0 THEN
    reward_amount := 15000;
  ELSE
    reward_amount := 10000;
  END IF;

  PERFORM add_reward(NEW.user_id, reward_amount, 'post', NEW.id, 'Đăng bài viết mới');
  RETURN NEW;
END;
$$;

-- Trigger for new post
CREATE TRIGGER on_post_created
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_new_post();

-- Trigger function for new comment
CREATE OR REPLACE FUNCTION public.reward_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM add_reward(NEW.user_id, 1000, 'comment', NEW.id, 'Bình luận mới');
  RETURN NEW;
END;
$$;

-- Trigger for new comment
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_new_comment();

-- Trigger function for new like
CREATE OR REPLACE FUNCTION public.reward_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM add_reward(NEW.user_id, 500, 'like', NEW.id, 'Thích bài viết');
  RETURN NEW;
END;
$$;

-- Trigger for new like
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_new_like();

-- Trigger function for accepted friendship
CREATE OR REPLACE FUNCTION public.reward_new_friendship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only reward when friendship is accepted
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    PERFORM add_reward(NEW.user_id, 2000, 'friend', NEW.id, 'Kết bạn thành công');
    PERFORM add_reward(NEW.friend_id, 2000, 'friend', NEW.id, 'Kết bạn thành công');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for accepted friendship
CREATE TRIGGER on_friendship_accepted
  AFTER UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_new_friendship();

-- Create indexes for better performance
CREATE INDEX idx_user_rewards_user_id ON public.user_rewards(user_id);
CREATE INDEX idx_reward_transactions_user_id ON public.reward_transactions(user_id);
CREATE INDEX idx_reward_transactions_created_at ON public.reward_transactions(created_at DESC);

-- Update trigger for updated_at
CREATE TRIGGER update_user_rewards_updated_at
  BEFORE UPDATE ON public.user_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Calculate and award CAMLY for existing users
DO $$
DECLARE
  user_record RECORD;
  post_count INTEGER;
  comment_count INTEGER;
  like_count INTEGER;
  friend_count INTEGER;
  total_reward BIGINT;
  posts_with_media INTEGER;
BEGIN
  FOR user_record IN SELECT id FROM public.profiles LOOP
    -- Count activities
    SELECT COUNT(*) INTO post_count FROM public.posts WHERE user_id = user_record.id;
    SELECT COUNT(*) INTO posts_with_media FROM public.posts WHERE user_id = user_record.id AND media IS NOT NULL AND jsonb_array_length(media) > 0;
    SELECT COUNT(*) INTO comment_count FROM public.comments WHERE user_id = user_record.id;
    SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE user_id = user_record.id;
    SELECT COUNT(*) INTO friend_count FROM public.friendships WHERE (user_id = user_record.id OR friend_id = user_record.id) AND status = 'accepted';
    
    -- Calculate total reward
    total_reward := 50000 + -- registration bonus
                   (posts_with_media * 15000) + -- posts with media
                   ((post_count - posts_with_media) * 10000) + -- posts without media
                   (comment_count * 1000) + -- comments
                   (like_count * 500) + -- likes
                   (friend_count * 2000); -- friends
    
    -- Initialize user_rewards
    IF total_reward > 50000 THEN
      INSERT INTO public.user_rewards (user_id, camly_balance, total_earned)
      VALUES (user_record.id, total_reward, total_reward)
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Log initial transaction
      INSERT INTO public.reward_transactions (user_id, amount, reward_type, description)
      VALUES (user_record.id, total_reward, 'initial_calculation', 'Tính toán thưởng cho hoạt động trước đó');
    END IF;
  END LOOP;
END $$;