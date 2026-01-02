-- Update process_private_call_gift to prevent multiple gifts for same invitation
CREATE OR REPLACE FUNCTION public.process_private_call_gift(p_sender_id uuid, p_receiver_id uuid, p_gift_id uuid, p_invitation_id uuid DEFAULT NULL::uuid)
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
  v_existing_call uuid;
  v_invitation_status text;
BEGIN
  -- Check if invitation is already accepted (prevent multiple gifts)
  IF p_invitation_id IS NOT NULL THEN
    SELECT status INTO v_invitation_status
    FROM public.private_call_invitations
    WHERE id = p_invitation_id;
    
    IF v_invitation_status = 'accepted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'This invitation has already been accepted');
    END IF;
    
    IF v_invitation_status != 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'This invitation is no longer valid');
    END IF;
  END IF;
  
  -- Check if there's already an active call between these users
  SELECT id INTO v_existing_call
  FROM public.private_calls
  WHERE status = 'active'
    AND ((caller_id = p_receiver_id AND receiver_id = p_sender_id)
      OR (caller_id = p_sender_id AND receiver_id = p_receiver_id))
    AND access_expires_at > now()
  LIMIT 1;
  
  IF v_existing_call IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an active private call with this user', 'call_id', v_existing_call);
  END IF;

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
  
  -- Update invitation status if provided (mark as accepted to prevent re-use)
  IF p_invitation_id IS NOT NULL THEN
    UPDATE public.private_call_invitations
    SET status = 'accepted', updated_at = now()
    WHERE id = p_invitation_id AND status = 'pending';
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