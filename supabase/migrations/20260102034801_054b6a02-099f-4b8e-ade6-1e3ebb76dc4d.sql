-- Update process_group_video_gift to remove admin revenue logging
-- Since men's recharge money is already admin's, we only need to track:
-- 1. Men's virtual point deductions (wallet)
-- 2. Women's earnings (for payouts)

CREATE OR REPLACE FUNCTION public.process_group_video_gift(p_sender_id uuid, p_group_id uuid, p_gift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group RECORD;
  v_gift RECORD;
  v_wallet_id uuid;
  v_balance numeric;
  v_new_balance numeric;
  v_women_share numeric;
  v_access_expires timestamp with time zone;
  v_is_super_user boolean;
  v_current_members integer;
  v_already_member boolean;
BEGIN
  -- Get group details
  SELECT * INTO v_group
  FROM public.private_groups
  WHERE id = p_group_id AND is_active = true
  FOR UPDATE;
  
  IF v_group IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found or inactive');
  END IF;
  
  -- Check if user already has membership (don't count towards limit)
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = p_group_id AND user_id = p_sender_id
  ) INTO v_already_member;
  
  -- Check 150 men limit (only for new members)
  IF NOT v_already_member THEN
    SELECT COUNT(*) INTO v_current_members
    FROM public.group_memberships
    WHERE group_id = p_group_id AND user_id != v_group.owner_id;
    
    IF v_current_members >= 150 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Group is full (150 men limit reached)');
    END IF;
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
  
  -- Calculate women's share (50% of gift price)
  v_women_share := v_gift.price * 0.5;
  
  -- Calculate access expiry (30 minutes from now)
  v_access_expires := now() + interval '30 minutes';
  
  -- Debit sender's wallet - full gift price (skip for super users)
  IF NOT v_is_super_user THEN
    v_new_balance := v_balance - v_gift.price;
    UPDATE public.wallets SET balance = v_new_balance, updated_at = now() WHERE id = v_wallet_id;
    
    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, description, status)
    VALUES (v_wallet_id, p_sender_id, 'debit', v_gift.price, 
            'Group video gift: ' || v_gift.emoji || ' ' || v_gift.name, 'completed');
  ELSE
    v_new_balance := v_balance;
  END IF;
  
  -- Credit woman's earnings (50% of gift price)
  INSERT INTO public.women_earnings (user_id, amount, earning_type, description)
  VALUES (v_group.owner_id, v_women_share, 'gift', 
          'Group video gift: ' || v_gift.emoji || ' from video access');
  
  -- Record gift transaction
  INSERT INTO public.gift_transactions (sender_id, receiver_id, gift_id, price_paid, status, message)
  VALUES (p_sender_id, v_group.owner_id, p_gift_id, v_gift.price, 'completed', 
          'Video call access for group: ' || v_group.name);
  
  -- Grant 30-minute video access
  INSERT INTO public.group_video_access (group_id, user_id, gift_id, gift_amount, access_expires_at)
  VALUES (p_group_id, p_sender_id, p_gift_id, v_gift.price, v_access_expires);
  
  -- Add membership if not already a member and update participant count
  IF NOT v_already_member THEN
    INSERT INTO public.group_memberships (group_id, user_id, has_access, gift_amount_paid)
    VALUES (p_group_id, p_sender_id, true, v_gift.price)
    ON CONFLICT (group_id, user_id) DO UPDATE SET has_access = true, gift_amount_paid = v_gift.price;
    
    UPDATE public.private_groups 
    SET participant_count = participant_count + 1 
    WHERE id = p_group_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'gift_name', v_gift.name,
    'gift_emoji', v_gift.emoji,
    'gift_price', v_gift.price,
    'women_share', v_women_share,
    'new_balance', v_new_balance,
    'access_expires_at', v_access_expires,
    'access_duration_minutes', 30,
    'group_language', v_group.owner_language
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;