-- Fix stuck call counts for women availability
-- Reset counts that don't match active sessions

UPDATE women_availability wa
SET current_call_count = (
  SELECT COUNT(*) 
  FROM video_call_sessions vcs 
  WHERE vcs.woman_user_id = wa.user_id 
    AND vcs.status IN ('active', 'ringing', 'connecting')
),
current_chat_count = (
  SELECT COUNT(*) 
  FROM active_chat_sessions acs 
  WHERE acs.woman_user_id = wa.user_id 
    AND acs.status = 'active'
);

-- Update is_available based on recalculated counts
UPDATE women_availability
SET is_available = (current_chat_count < max_concurrent_chats AND current_call_count < max_concurrent_calls);

-- Also fix any user_status active counts for men
UPDATE user_status us
SET active_chat_count = (
  SELECT COUNT(*) 
  FROM active_chat_sessions acs 
  WHERE acs.man_user_id = us.user_id 
    AND acs.status = 'active'
),
active_call_count = (
  SELECT COUNT(*) 
  FROM video_call_sessions vcs 
  WHERE vcs.man_user_id = us.user_id 
    AND vcs.status IN ('active', 'ringing', 'connecting')
);