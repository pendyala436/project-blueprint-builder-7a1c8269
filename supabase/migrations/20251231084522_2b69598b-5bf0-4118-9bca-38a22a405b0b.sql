-- Performance Optimization: Add indexes for faster queries

-- User status indexes for online user lookups
CREATE INDEX IF NOT EXISTS idx_user_status_online ON public.user_status(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON public.user_status(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_user_status_user_online ON public.user_status(user_id, is_online);

-- Profile indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_gender_status ON public.profiles(gender, account_status, approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_gender ON public.profiles(user_id, gender);
CREATE INDEX IF NOT EXISTS idx_profiles_language ON public.profiles(preferred_language);
CREATE INDEX IF NOT EXISTS idx_profiles_primary_lang ON public.profiles(primary_language);

-- Active chat session indexes
CREATE INDEX IF NOT EXISTS idx_active_chats_status ON public.active_chat_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_active_chats_man ON public.active_chat_sessions(man_user_id, status);
CREATE INDEX IF NOT EXISTS idx_active_chats_woman ON public.active_chat_sessions(woman_user_id, status);
CREATE INDEX IF NOT EXISTS idx_active_chats_activity ON public.active_chat_sessions(last_activity_at DESC);

-- Chat messages indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.chat_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id, created_at DESC);

-- Wallet indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(user_id, type, created_at DESC);

-- Women earnings indexes
CREATE INDEX IF NOT EXISTS idx_women_earnings_user ON public.women_earnings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_women_earnings_type ON public.women_earnings(user_id, earning_type);

-- Women availability indexes
CREATE INDEX IF NOT EXISTS idx_women_availability_available ON public.women_availability(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_women_availability_user ON public.women_availability(user_id);

-- Video call session indexes
CREATE INDEX IF NOT EXISTS idx_video_sessions_status ON public.video_call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_sessions_man ON public.video_call_sessions(man_user_id, status);
CREATE INDEX IF NOT EXISTS idx_video_sessions_woman ON public.video_call_sessions(woman_user_id, status);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Female profiles indexes for matching
CREATE INDEX IF NOT EXISTS idx_female_profiles_approval ON public.female_profiles(approval_status, account_status);
CREATE INDEX IF NOT EXISTS idx_female_profiles_language ON public.female_profiles(preferred_language);

-- Male profiles indexes
CREATE INDEX IF NOT EXISTS idx_male_profiles_status ON public.male_profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_male_profiles_language ON public.male_profiles(preferred_language);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_user ON public.matches(user_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_matched ON public.matches(matched_user_id, status);

-- Language limits indexes
CREATE INDEX IF NOT EXISTS idx_language_limits_active ON public.language_limits(is_active) WHERE is_active = true;

-- Gifts indexes
CREATE INDEX IF NOT EXISTS idx_gifts_active ON public.gifts(is_active, sort_order) WHERE is_active = true;

-- Gift transactions indexes
CREATE INDEX IF NOT EXISTS idx_gift_transactions_sender ON public.gift_transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_receiver ON public.gift_transactions(receiver_id, created_at DESC);

-- Chat pricing index
CREATE INDEX IF NOT EXISTS idx_chat_pricing_active ON public.chat_pricing(is_active) WHERE is_active = true;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- Community and language group indexes
CREATE INDEX IF NOT EXISTS idx_lang_community_members_group ON public.language_community_members(group_id, is_active);
CREATE INDEX IF NOT EXISTS idx_lang_community_messages_lang ON public.language_community_messages(language_code, created_at DESC);

-- Admin revenue indexes
CREATE INDEX IF NOT EXISTS idx_admin_revenue_type ON public.admin_revenue_transactions(transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_revenue_date ON public.admin_revenue_transactions(created_at DESC);

-- Analyze tables for query planner
ANALYZE public.user_status;
ANALYZE public.profiles;
ANALYZE public.active_chat_sessions;
ANALYZE public.chat_messages;
ANALYZE public.wallets;
ANALYZE public.wallet_transactions;
ANALYZE public.women_earnings;
ANALYZE public.women_availability;
ANALYZE public.video_call_sessions;
ANALYZE public.user_roles;
ANALYZE public.female_profiles;
ANALYZE public.male_profiles;
ANALYZE public.matches;
ANALYZE public.gifts;
ANALYZE public.chat_pricing;