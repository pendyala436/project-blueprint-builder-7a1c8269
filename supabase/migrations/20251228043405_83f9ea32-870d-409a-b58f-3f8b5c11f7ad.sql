-- Update default max_concurrent_calls to 3 for women (matching chat limit)
ALTER TABLE public.women_availability 
ALTER COLUMN max_concurrent_calls SET DEFAULT 3;

-- Update existing women to have max 3 concurrent calls
UPDATE public.women_availability 
SET max_concurrent_calls = 3 
WHERE max_concurrent_calls = 1;

-- Also ensure user_status has sufficient tracking for men's parallel sessions
-- Add max_parallel_chats column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_status' AND column_name = 'max_parallel_chats'
  ) THEN
    ALTER TABLE public.user_status ADD COLUMN max_parallel_chats integer DEFAULT 3;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_status' AND column_name = 'active_call_count'
  ) THEN
    ALTER TABLE public.user_status ADD COLUMN active_call_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_status' AND column_name = 'max_parallel_calls'
  ) THEN
    ALTER TABLE public.user_status ADD COLUMN max_parallel_calls integer DEFAULT 3;
  END IF;
END $$;

-- Update the sync function for video calls to also track men's call counts
CREATE OR REPLACE FUNCTION public.sync_all_video_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle INSERT of new active session
  IF TG_OP = 'INSERT' AND NEW.status IN ('active', 'ringing', 'connecting') THEN
    -- Increment woman's call count
    UPDATE women_availability
    SET current_call_count = COALESCE(current_call_count, 0) + 1
    WHERE user_id = NEW.woman_user_id;
    
    -- Increment man's call count
    UPDATE user_status
    SET active_call_count = COALESCE(active_call_count, 0) + 1,
        active_chat_count = COALESCE(active_chat_count, 0) + 1
    WHERE user_id = NEW.man_user_id;
  END IF;
  
  -- Handle UPDATE to ended
  IF TG_OP = 'UPDATE' AND OLD.status IN ('active', 'ringing', 'connecting') AND NEW.status = 'ended' THEN
    -- Decrement woman's call count
    UPDATE women_availability
    SET current_call_count = GREATEST(0, COALESCE(current_call_count, 0) - 1)
    WHERE user_id = NEW.woman_user_id;
    
    -- Decrement man's call count
    UPDATE user_status
    SET active_call_count = GREATEST(0, COALESCE(active_call_count, 0) - 1),
        active_chat_count = GREATEST(0, COALESCE(active_chat_count, 0) - 1)
    WHERE user_id = NEW.man_user_id;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' AND OLD.status IN ('active', 'ringing', 'connecting') THEN
    -- Decrement woman's call count
    UPDATE women_availability
    SET current_call_count = GREATEST(0, COALESCE(current_call_count, 0) - 1)
    WHERE user_id = OLD.woman_user_id;
    
    -- Decrement man's call count
    UPDATE user_status
    SET active_call_count = GREATEST(0, COALESCE(active_call_count, 0) - 1),
        active_chat_count = GREATEST(0, COALESCE(active_chat_count, 0) - 1)
    WHERE user_id = OLD.man_user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update cleanup function to also reset call counts
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. End chat sessions idle for 3+ minutes
  UPDATE active_chat_sessions
  SET status = 'ended',
      ended_at = NOW(),
      end_reason = 'idle_3min'
  WHERE status = 'active'
    AND last_activity_at < NOW() - INTERVAL '3 minutes';

  -- 2. Delete chat messages older than 7 days
  DELETE FROM chat_messages
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- 3. Delete group messages older than 15 minutes (ephemeral chat)
  DELETE FROM group_messages
  WHERE created_at < NOW() - INTERVAL '15 minutes';

  -- 4. Delete language community messages older than 15 minutes
  DELETE FROM language_community_messages
  WHERE created_at < NOW() - INTERVAL '15 minutes';

  -- 5. Delete wallet transactions older than 9 years
  DELETE FROM wallet_transactions
  WHERE created_at < NOW() - INTERVAL '9 years';

  -- 6. Delete admin revenue transactions older than 9 years
  DELETE FROM admin_revenue_transactions
  WHERE created_at < NOW() - INTERVAL '9 years';

  -- 7. Delete women earnings older than 9 years
  DELETE FROM women_earnings
  WHERE created_at < NOW() - INTERVAL '9 years';

  -- 8. Delete gift transactions older than 9 years
  DELETE FROM gift_transactions
  WHERE created_at < NOW() - INTERVAL '9 years';

  -- 9. Mark stale users as offline (10 min inactivity)
  UPDATE user_status
  SET is_online = false
  WHERE is_online = true
    AND last_seen < NOW() - INTERVAL '10 minutes';

  -- 10. Reset women_availability counts for users with no active sessions
  UPDATE women_availability wa
  SET current_chat_count = 0
  WHERE current_chat_count > 0
    AND NOT EXISTS (
      SELECT 1 FROM active_chat_sessions acs 
      WHERE acs.woman_user_id = wa.user_id AND acs.status = 'active'
    );

  UPDATE women_availability wa
  SET current_call_count = 0
  WHERE current_call_count > 0
    AND NOT EXISTS (
      SELECT 1 FROM video_call_sessions vcs 
      WHERE vcs.woman_user_id = wa.user_id AND vcs.status IN ('active', 'ringing', 'connecting')
    );

  -- 11. Reset men's active_chat_count for users with no active sessions
  UPDATE user_status us
  SET active_chat_count = 0
  WHERE active_chat_count > 0
    AND NOT EXISTS (
      SELECT 1 FROM active_chat_sessions acs 
      WHERE acs.man_user_id = us.user_id AND acs.status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM video_call_sessions vcs 
      WHERE vcs.man_user_id = us.user_id AND vcs.status IN ('active', 'ringing', 'connecting')
    );

  -- 12. Reset men's active_call_count for users with no active calls
  UPDATE user_status us
  SET active_call_count = 0
  WHERE COALESCE(active_call_count, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM video_call_sessions vcs 
      WHERE vcs.man_user_id = us.user_id AND vcs.status IN ('active', 'ringing', 'connecting')
    );
END;
$$;