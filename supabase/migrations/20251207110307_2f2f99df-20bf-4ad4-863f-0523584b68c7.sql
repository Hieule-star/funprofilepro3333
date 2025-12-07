-- Disable game reward trigger (keep game_scores for leaderboard)
-- Games will still save scores but will NOT award CAMLY coins
DROP TRIGGER IF EXISTS on_game_score_insert ON public.game_scores;

-- Add comment to explain the change
COMMENT ON TABLE public.game_scores IS 'Game scores for leaderboard only - rewards disabled since 2025-06-07';