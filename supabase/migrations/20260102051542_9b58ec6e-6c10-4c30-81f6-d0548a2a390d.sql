-- Add gift-based access fields to private_calls table for 1-to-1 video calls
ALTER TABLE public.private_calls
ADD COLUMN IF NOT EXISTS gift_id uuid REFERENCES public.gifts(id),
ADD COLUMN IF NOT EXISTS gift_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS access_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS woman_earnings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_earnings numeric DEFAULT 0;

-- Create a table to store 1-to-1 private call invitations from women to men
CREATE TABLE IF NOT EXISTS public.private_call_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id uuid NOT NULL, -- Woman who initiates
  receiver_id uuid NOT NULL, -- Man who receives
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
  min_gift_amount numeric NOT NULL DEFAULT 100,
  caller_language text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on private_call_invitations
ALTER TABLE public.private_call_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for private_call_invitations
CREATE POLICY "Users can view their own invitations"
ON public.private_call_invitations
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Women can create invitations"
ON public.private_call_invitations
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their invitations"
ON public.private_call_invitations
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Update private_calls RLS to allow gift-based access
DROP POLICY IF EXISTS "Users can view their own calls" ON public.private_calls;
CREATE POLICY "Users can view their own calls"
ON public.private_calls
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create calls" ON public.private_calls;
CREATE POLICY "Users can create calls"
ON public.private_calls
FOR INSERT
WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can update their calls" ON public.private_calls;
CREATE POLICY "Users can update their calls"
ON public.private_calls
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Function to process gift payment for private 1-to-1 video call
CREATE OR REPLACE FUNCTION public.process_private_call_gift(
  p_sender_id uuid,
  p_receiver_id uuid, 
  p_gift_id uuid,
  p_invitation_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_gift RECORD;
  v_wallet_id uuid;
  v_balance numeric;
  v_new_balance numeric;
  v_women_share numeric;
  v_admin_share numeric;
  v_access_expires timestamp with time zone;
  v_is_super_user boolean;
  v_call_id uuid;
  v_receiver_language text;
BEGIN
  -- Get gift details
  SELECT * INTO v_gift
  FROM public.gifts
  WHERE id = p_gift_id AND is_active = true;
  
  IF v_gift IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  
  -- Get receiver's (woman's) language
  SELECT primary_language INTO v_receiver_language
  FROM public.profiles
  WHERE user_id = p_receiver_id;
  
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
  
  -- Calculate shares (50% each)
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
            'Private 1-to-1 video call gift: ' || v_gift.emoji || ' ' || v_gift.name, 'completed');
  ELSE
    v_new_balance := v_balance;
  END IF;
  
  -- Credit woman's earnings
  INSERT INTO public.women_earnings (user_id, amount, earning_type, description)
  VALUES (p_receiver_id, v_women_share, 'private_call', 
          'Private video call gift: ' || v_gift.emoji || ' ' || v_gift.name);
  
  -- Record gift transaction
  INSERT INTO public.gift_transactions (sender_id, receiver_id, gift_id, price_paid, status, message)
  VALUES (p_sender_id, p_receiver_id, p_gift_id, v_gift.price, 'completed', 
          'Private 1-to-1 video call access');
  
  -- Log admin revenue
  INSERT INTO public.admin_revenue_transactions (
    transaction_type, amount, man_user_id, woman_user_id, description, currency
  ) VALUES (
    'private_call_gift', v_admin_share, p_sender_id, p_receiver_id,
    'Private call gift revenue', 'INR'
  );
  
  -- Create the private call session
  INSERT INTO public.private_calls (
    caller_id, receiver_id, status, call_type, 
    gift_id, gift_amount, access_expires_at, woman_earnings, admin_earnings
  ) VALUES (
    p_receiver_id, p_sender_id, 'active', 'video',
    p_gift_id, v_gift.price, v_access_expires, v_women_share, v_admin_share
  ) RETURNING id INTO v_call_id;
  
  -- Update invitation status if provided
  IF p_invitation_id IS NOT NULL THEN
    UPDATE public.private_call_invitations
    SET status = 'accepted', updated_at = now()
    WHERE id = p_invitation_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'call_id', v_call_id,
    'gift_name', v_gift.name,
    'gift_emoji', v_gift.emoji,
    'gift_price', v_gift.price,
    'women_share', v_women_share,
    'admin_share', v_admin_share,
    'new_balance', v_new_balance,
    'access_expires_at', v_access_expires,
    'access_duration_minutes', 30,
    'receiver_language', v_receiver_language
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Function to check private call access
CREATE OR REPLACE FUNCTION public.check_private_call_access(p_call_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_call RECORD;
  v_remaining_seconds integer;
BEGIN
  -- Get call details
  SELECT * INTO v_call
  FROM public.private_calls
  WHERE id = p_call_id AND status = 'active';
  
  IF v_call IS NULL THEN
    RETURN jsonb_build_object('has_access', false, 'error', 'Call not found or ended');
  END IF;
  
  -- Check if user is part of the call
  IF v_call.caller_id != p_user_id AND v_call.receiver_id != p_user_id THEN
    RETURN jsonb_build_object('has_access', false, 'error', 'Not authorized');
  END IF;
  
  -- Check if access has expired
  IF v_call.access_expires_at IS NOT NULL AND v_call.access_expires_at < now() THEN
    -- Mark call as ended
    UPDATE public.private_calls
    SET status = 'ended', ended_at = now()
    WHERE id = p_call_id;
    
    RETURN jsonb_build_object('has_access', false, 'expired', true);
  END IF;
  
  -- Calculate remaining time
  v_remaining_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_call.access_expires_at - now()))::integer);
  
  RETURN jsonb_build_object(
    'has_access', true,
    'is_caller', v_call.caller_id = p_user_id,
    'remaining_seconds', v_remaining_seconds,
    'access_expires_at', v_call.access_expires_at,
    'call_id', v_call.id
  );
END;
$function$;

-- Enable realtime for private_call_invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_call_invitations;