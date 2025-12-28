-- Fix Rani's availability - she's online with 0 chats so should be available
UPDATE women_availability 
SET is_available = true 
WHERE user_id = 'cd6e623c-2d2a-4cc2-8705-e0ae5b3277a3';

-- Also ensure all women with current_chat_count = 0 who are online are marked as available
UPDATE women_availability wa
SET is_available = true
WHERE wa.current_chat_count < wa.max_concurrent_chats
  AND wa.current_call_count < wa.max_concurrent_calls
  AND EXISTS (
    SELECT 1 FROM user_status us 
    WHERE us.user_id = wa.user_id 
    AND us.is_online = true
  );