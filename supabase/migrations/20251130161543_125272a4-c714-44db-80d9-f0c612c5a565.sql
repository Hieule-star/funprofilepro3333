-- Create function to reward game scores
CREATE OR REPLACE FUNCTION public.reward_game_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  reward_amount BIGINT;
  game_name TEXT;
BEGIN
  -- Calculate reward: score × 100
  reward_amount := NEW.score * 100;
  
  -- Format game name for display
  game_name := CASE NEW.game_type
    WHEN 'tic-tac-toe' THEN 'Tic Tac Toe'
    WHEN 'memory' THEN 'Memory Game'
    WHEN 'puzzle' THEN 'Puzzle Slider'
    ELSE NEW.game_type
  END;
  
  -- Award CAMLY coins
  PERFORM add_reward(
    NEW.user_id, 
    reward_amount, 
    'game', 
    NEW.id, 
    'Chơi game ' || game_name || ' - ' || NEW.score || ' điểm'
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger on game_scores table
CREATE TRIGGER on_game_score_insert
  AFTER INSERT ON public.game_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_game_score();