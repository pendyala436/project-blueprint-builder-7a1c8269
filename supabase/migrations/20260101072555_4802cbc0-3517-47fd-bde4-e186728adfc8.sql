-- Add owner's mother tongue language to private_groups for naming video calls
ALTER TABLE public.private_groups 
ADD COLUMN IF NOT EXISTS owner_language text;

-- Create table to track video call access per user per group (30 min per gift)
CREATE TABLE IF NOT EXISTS public.group_video_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.private_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  gift_id uuid REFERENCES public.gifts(id),
  gift_amount numeric NOT NULL DEFAULT 0,
  access_granted_at timestamp with time zone NOT NULL DEFAULT now(),
  access_expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 minutes'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id, access_granted_at)
);

-- Enable RLS on group_video_access
ALTER TABLE public.group_video_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_video_access
CREATE POLICY "Users can view their own video access"
ON public.group_video_access FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Group owners can view access in their groups"
ON public.group_video_access FOR SELECT
USING (EXISTS (
  SELECT 1 FROM private_groups pg 
  WHERE pg.id = group_id AND pg.owner_id = auth.uid()
));

CREATE POLICY "System can insert video access"
ON public.group_video_access FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update video access"
ON public.group_video_access FOR UPDATE
USING (true);

-- Create function to process group video gift for 30-minute access
CREATE OR REPLACE FUNCTION public.process_group_video_gift(
  p_sender_id uuid,
  p_group_id uuid,
  p_gift_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group RECORD;
  v_gift RECORD;
  v_wallet_id uuid;
  v_balance numeric;
  v_new_balance numeric;
  v_women_share numeric;
  v_admin_share numeric;
  v_access_expires timestamp with time zone;
  v_is_super_user boolean;
BEGIN
  -- Get group details
  SELECT * INTO v_group
  FROM public.private_groups
  WHERE id = p_group_id AND is_active = true
  FOR UPDATE;
  
  IF v_group IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found or inactive');
  END IF;
  
  -- Get gift details
  SELECT * INTO v_gift
  FROM public.gifts
  WHERE id = p_gift_id AND is_active = true;
  
  IF v_gift IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  
  -- Check minimum gift amount
  IF v_gift.price < v_group.min_gift_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift amount is below minimum required: ₹' || v_group.min_gift_amount);
  END IF;
  
  -- Check if super user
  v_is_super_user := public.should_bypass_balance(p_sender_id);
  
  -- Lock sender's wallet
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = p_sender_id
  FOR UPDATE;
  
  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  -- Check balance (skip for super users)
  IF NOT v_is_super_user AND v_balance < v_gift.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Calculate shares (50/50 split)
  v_women_share := v_gift.price * 0.5;
  v_admin_share := v_gift.price * 0.5;
  
  -- Calculate access expiry (30 minutes from now)
  v_access_expires := now() + interval '30 minutes';
  
  -- Debit sender's wallet (skip for super users)
  IF NOT v_is_super_user THEN
    v_new_balance := v_balance - v_gift.price;
    UPDATE public.wallets SET balance = v_new_balance, updated_at = now() WHERE id = v_wallet_id;
    
    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, description, status)
    VALUES (v_wallet_id, p_sender_id, 'debit', v_gift.price, 
            'Group video gift: ' || v_gift.emoji || ' ' || v_gift.name, 'completed');
  ELSE
    v_new_balance := v_balance;
  END IF;
  
  -- Credit woman's earnings
  INSERT INTO public.women_earnings (user_id, amount, earning_type, description)
  VALUES (v_group.owner_id, v_women_share, 'gift', 
          'Group video gift: ' || v_gift.emoji || ' from video access');
  
  -- Log admin revenue
  INSERT INTO public.admin_revenue_transactions (transaction_type, amount, man_user_id, woman_user_id, description, currency)
  VALUES ('gift_revenue', v_admin_share, p_sender_id, v_group.owner_id, 
          'Group video gift revenue: ' || v_gift.name, 'INR');
  
  -- Record gift transaction
  INSERT INTO public.gift_transactions (sender_id, receiver_id, gift_id, price_paid, status, message)
  VALUES (p_sender_id, v_group.owner_id, p_gift_id, v_gift.price, 'completed', 
          'Video call access for group: ' || v_group.name);
  
  -- Grant 30-minute video access
  INSERT INTO public.group_video_access (group_id, user_id, gift_id, gift_amount, access_expires_at)
  VALUES (p_group_id, p_sender_id, p_gift_id, v_gift.price, v_access_expires);
  
  RETURN jsonb_build_object(
    'success', true,
    'gift_name', v_gift.name,
    'gift_emoji', v_gift.emoji,
    'gift_price', v_gift.price,
    'women_share', v_women_share,
    'admin_share', v_admin_share,
    'new_balance', v_new_balance,
    'access_expires_at', v_access_expires,
    'access_duration_minutes', 30,
    'group_language', v_group.owner_language
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create function to check if user has active video access
CREATE OR REPLACE FUNCTION public.check_group_video_access(
  p_user_id uuid,
  p_group_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_access RECORD;
  v_remaining_seconds integer;
  v_group RECORD;
BEGIN
  -- Check if user is group owner (always has access)
  SELECT * INTO v_group FROM public.private_groups WHERE id = p_group_id;
  
  IF v_group.owner_id = p_user_id THEN
    RETURN jsonb_build_object(
      'has_access', true,
      'is_owner', true,
      'remaining_seconds', -1,
      'group_language', v_group.owner_language
    );
  END IF;
  
  -- Get active access record
  SELECT * INTO v_access
  FROM public.group_video_access
  WHERE group_id = p_group_id 
    AND user_id = p_user_id 
    AND is_active = true
    AND access_expires_at > now()
  ORDER BY access_expires_at DESC
  LIMIT 1;
  
  IF v_access IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'is_owner', false,
      'remaining_seconds', 0,
      'group_language', v_group.owner_language,
      'min_gift_amount', v_group.min_gift_amount
    );
  END IF;
  
  -- Calculate remaining time
  v_remaining_seconds := EXTRACT(EPOCH FROM (v_access.access_expires_at - now()))::integer;
  
  RETURN jsonb_build_object(
    'has_access', true,
    'is_owner', false,
    'remaining_seconds', v_remaining_seconds,
    'access_expires_at', v_access.access_expires_at,
    'group_language', v_group.owner_language
  );
END;
$$;

-- Create function to expire video access
CREATE OR REPLACE FUNCTION public.expire_group_video_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.group_video_access
  SET is_active = false
  WHERE is_active = true AND access_expires_at < now();
END;
$$;