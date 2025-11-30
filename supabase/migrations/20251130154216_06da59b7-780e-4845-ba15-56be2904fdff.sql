-- Enable realtime for user_rewards and reward_transactions tables
ALTER TABLE public.user_rewards REPLICA IDENTITY FULL;
ALTER TABLE public.reward_transactions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_transactions;