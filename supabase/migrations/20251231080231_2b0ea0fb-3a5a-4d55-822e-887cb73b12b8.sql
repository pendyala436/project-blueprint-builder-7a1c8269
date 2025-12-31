-- Update cleanup function to maintain chat and video call history for 15 days
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. End chat sessions idle for 3+ minutes
  UPDATE active_chat_sessions
  SET status = 'ended',
      ended_at = NOW(),
      end_reason = 'idle_3min'
  WHERE status = 'active'
    AND last_activity_at < NOW() - INTERVAL '3 minutes';

  -- 2. Delete chat messages older than 15 days
  DELETE FROM chat_messages
  WHERE created_at < NOW() - INTERVAL '15 days';

  -- 3. Delete ended chat sessions older than 15 days
  DELETE FROM active_chat_sessions
  WHERE status = 'ended'
    AND ended_at < NOW() - INTERVAL '15 days';

  -- 4. Delete ended video call sessions older than 15 days
  DELETE FROM video_call_sessions
  WHERE status = 'ended'
    AND ended_at < NOW() - INTERVAL '15 days';

  -- 5. Delete group messages older than 15 minutes (ephemeral chat)
  DELETE FROM group_messages
  WHERE created_at < NOW() - INTERVAL '15 minutes';

  -- 6. Delete language community messages older than 2 days
  DELETE FROM language_community_messages
  WHERE created_at < NOW() - INTERVAL '2 days';

  -- 7. Delete wallet transactions older than 9 years
  DELETE FROM wallet_transactions
  WHERE created_at < NOW() - INTERVAL '9 years';

  -- 8. Delete admin revenue transactions older than 9 years
  DELETE FROM admin_revenue_transactions
  WHERE created_at < NOW() - INTERVAL '9 years';

  -- 9. Delete women earnings older than 9 years
  DELETE FROM women_earnings
  WHERE created_at < NOW() - INTERVAL '9 years';

  -- 10. Delete gift transactions older than 9 years
  DELETE FROM gift_transactions
  WHERE created_at < NOW() - INTERVAL '9 years';

  -- 11. Mark stale users as offline (10 min inactivity)
  UPDATE user_status
  SET is_online = false
  WHERE is_online = true
    AND last_seen < NOW() - INTERVAL '10 minutes';

  -- 12. Reset women_availability counts for users with no active sessions
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

  -- 13. Reset men's active_chat_count for users with no active sessions
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

  -- 14. Reset men's active_call_count for users with no active calls
  UPDATE user_status us
  SET active_call_count = 0
  WHERE COALESCE(active_call_count, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM video_call_sessions vcs 
      WHERE vcs.man_user_id = us.user_id AND vcs.status IN ('active', 'ringing', 'connecting')
    );
END;
$function$;

-- Update the video cleanup function to keep ended sessions for 15 days
CREATE OR REPLACE FUNCTION public.cleanup_video_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete ended video sessions older than 15 days
  DELETE FROM video_call_sessions
  WHERE status = 'ended'
    AND ended_at < NOW() - INTERVAL '15 days';
END;
$function$;