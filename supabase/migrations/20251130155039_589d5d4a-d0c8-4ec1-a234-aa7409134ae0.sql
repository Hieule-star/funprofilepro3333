-- Function to calculate streak (fixed variable name)
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streak_count INTEGER := 0;
  check_current_date DATE := CURRENT_DATE;
  check_date DATE;
BEGIN
  -- Check today first
  SELECT checkin_date INTO check_date
  FROM public.daily_checkins
  WHERE user_id = p_user_id AND checkin_date = check_current_date;
  
  -- If not checked in today, check yesterday
  IF check_date IS NULL THEN
    check_current_date := CURRENT_DATE - INTERVAL '1 day';
  END IF;
  
  -- Count consecutive days
  LOOP
    SELECT checkin_date INTO check_date
    FROM public.daily_checkins
    WHERE user_id = p_user_id AND checkin_date = check_current_date;
    
    EXIT WHEN check_date IS NULL;
    
    streak_count := streak_count + 1;
    check_current_date := check_current_date - INTERVAL '1 day';
  END LOOP;
  
  RETURN streak_count;
END;
$$;

-- Function to process daily check-in
CREATE OR REPLACE FUNCTION public.process_daily_checkin(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin_exists BOOLEAN;
  v_streak INTEGER;
  v_bonus_awarded BOOLEAN := false;
  v_reward_amount BIGINT := 5000;
  v_result JSON;
BEGIN
  -- Check if already checked in today
  SELECT EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE user_id = p_user_id AND checkin_date = CURRENT_DATE
  ) INTO v_checkin_exists;
  
  IF v_checkin_exists THEN
    RAISE EXCEPTION 'Already checked in today';
  END IF;
  
  -- Calculate current streak (before today)
  v_streak := get_user_streak(p_user_id);
  v_streak := v_streak + 1; -- Add today
  
  -- Check if eligible for 7-day streak bonus
  IF v_streak >= 7 AND v_streak % 7 = 0 THEN
    v_bonus_awarded := true;
    v_reward_amount := v_reward_amount + 50000;
  END IF;
  
  -- Insert check-in record
  INSERT INTO public.daily_checkins (user_id, checkin_date, streak_count, bonus_awarded)
  VALUES (p_user_id, CURRENT_DATE, v_streak, v_bonus_awarded);
  
  -- Award CAMLY coins
  PERFORM add_reward(
    p_user_id,
    v_reward_amount,
    'daily_checkin',
    NULL,
    CASE 
      WHEN v_bonus_awarded THEN 'Check-in hàng ngày + Streak Bonus!'
      ELSE 'Check-in hàng ngày'
    END
  );
  
  -- Return result
  v_result := json_build_object(
    'success', true,
    'streak', v_streak,
    'bonus_awarded', v_bonus_awarded,
    'reward_amount', v_reward_amount
  );
  
  RETURN v_result;
END;
$$;