/**
 * Authentication Service
 *
 * Handles all authentication-related API calls.
 * Centralizes auth logic and maps Supabase error codes to
 * user-friendly messages via the centralized error system.
 */

import { supabase } from '@/integrations/supabase/client';
import { classifyError, logError } from '@/lib/errors';

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logError(error, 'signIn');
      const appError = classifyError(error, 'log in');
      return { success: false, error: appError.message };
    }

    return {
      success: true,
      user: data.user ? { id: data.user.id, email: data.user.email ?? null } : undefined,
    };
  } catch (err) {
    logError(err, 'signIn');
    const appError = classifyError(err, 'log in');
    return { success: false, error: appError.message };
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      logError(error, 'signUp');
      const appError = classifyError(error, 'create your account');
      return { success: false, error: appError.message };
    }

    return {
      success: true,
      user: data.user ? { id: data.user.id, email: data.user.email ?? null } : undefined,
    };
  } catch (err) {
    logError(err, 'signUp');
    const appError = classifyError(err, 'create your account');
    return { success: false, error: appError.message };
  }
}

/**
 * Sign out current user - sets offline status before logout
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const now = new Date().toISOString();
      // Best-effort: set offline, end active sessions
      await Promise.allSettled([
        supabase
          .from('user_status')
          .update({ is_online: false, last_seen: now, updated_at: now })
          .eq('user_id', session.user.id),
        supabase
          .from('active_chat_sessions')
          .update({ status: 'ended', ended_at: now, end_reason: 'user_logout' })
          .or(`man_user_id.eq.${session.user.id},woman_user_id.eq.${session.user.id}`)
          .eq('status', 'active'),
      ]);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      logError(error, 'signOut');
      const appError = classifyError(error, 'log out');
      return { success: false, error: appError.message };
    }

    return { success: true };
  } catch (err) {
    logError(err, 'signOut');
    return {
      success: false,
      error: 'Unable to log out. Please refresh the page and try again.',
    };
  }
}

/**
 * Check if user has a specific role
 */
export async function checkUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();

  return !!data;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange((_, session) => {
    callback(
      session?.user ? { id: session.user.id, email: session.user.email ?? null } : null
    );
  });
}
