-- Enable REPLICA IDENTITY FULL for better realtime updates
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;