-- Create leader_admin_messages table for secure chat between leaders and admin
CREATE TABLE public.leader_admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('leader', 'admin')),
  language_code TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leader_admin_messages ENABLE ROW LEVEL SECURITY;

-- Policies for leader_admin_messages
CREATE POLICY "Leaders can view their messages"
ON public.leader_admin_messages FOR SELECT
USING (
  leader_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Leaders can send messages"
ON public.leader_admin_messages FOR INSERT
WITH CHECK (
  (sender_id = auth.uid() AND sender_role = 'leader' AND leader_id = auth.uid()) OR
  (sender_id = auth.uid() AND sender_role = 'admin' AND public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Messages can be marked as read"
ON public.leader_admin_messages FOR UPDATE
USING (
  leader_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin')
);

-- Add activity_status to community_leaders table
ALTER TABLE public.community_leaders 
ADD COLUMN IF NOT EXISTS activity_status TEXT DEFAULT 'active' CHECK (activity_status IN ('active', 'absent', 'managing_shifts')),
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leader_admin_messages_leader ON public.leader_admin_messages(leader_id);
CREATE INDEX IF NOT EXISTS idx_leader_admin_messages_created ON public.leader_admin_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_leaders_status ON public.community_leaders(status, language_code);