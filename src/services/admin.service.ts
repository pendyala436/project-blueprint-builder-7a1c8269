/**
 * Admin Service
 * 
 * Handles all admin-related API calls.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export interface PlatformMetrics {
  total_users: number;
  active_users: number;
  male_users: number;
  female_users: number;
  new_users: number;
  total_chats: number;
  active_chats: number;
  total_messages: number;
  men_recharges: number;
  men_spent: number;
  women_earnings: number;
  admin_profit: number;
  gift_revenue: number;
  pending_withdrawals: number;
  completed_withdrawals: number;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  status: string;
  created_at: string;
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  return !!data;
}

/**
 * Get platform metrics for a date
 */
export async function getPlatformMetrics(date?: string): Promise<PlatformMetrics | null> {
  const query = supabase
    .from('platform_metrics')
    .select('*')
    .order('metric_date', { ascending: false })
    .limit(1);

  if (date) {
    query.eq('metric_date', date);
  }

  const { data } = await query.maybeSingle();
  return data;
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(
  page = 1,
  limit = 50
): Promise<{ logs: AuditLog[]; total: number }> {
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return {
    logs: data || [],
    total: count || 0,
  };
}

/**
 * Create audit log entry
 */
export async function createAuditLog(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: string
): Promise<void> {
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    action,
    action_type: 'admin',
    resource_type: resourceType,
    resource_id: resourceId || null,
    details: details || null,
  });
}

/**
 * Get all users with pagination
 */
export async function getUsers(
  page = 1,
  limit = 50,
  filters?: { gender?: string; status?: string }
) {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.gender) {
    query = query.eq('gender', filters.gender);
  }

  if (filters?.status) {
    query = query.eq('account_status', filters.status);
  }

  const { data, count } = await query;

  return {
    users: data || [],
    total: count || 0,
  };
}

/**
 * Update user status
 */
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'suspended' | 'banned'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ account_status: status })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get pending women approvals
 */
export async function getPendingWomenApprovals() {
  const { data } = await supabase
    .from('female_profiles')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Approve or reject woman profile
 */
export async function updateWomanApproval(
  userId: string,
  approved: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('female_profiles')
    .update({
      approval_status: approved ? 'approved' : 'rejected',
      ai_disapproval_reason: approved ? null : reason,
    })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
