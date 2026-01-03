
-- Delete all transaction and earnings data
DELETE FROM wallet_transactions;
DELETE FROM gift_transactions;
DELETE FROM admin_revenue_transactions;
DELETE FROM women_earnings;
DELETE FROM withdrawal_requests;
DELETE FROM active_chat_sessions;
DELETE FROM platform_metrics;

-- Reset all wallet balances to zero
UPDATE wallets SET balance = 0, updated_at = now();

-- Reset female profile statistics
UPDATE female_profiles SET total_chats_count = 0, avg_response_time_seconds = 0, performance_score = 100;
