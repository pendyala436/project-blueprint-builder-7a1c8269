/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls.
 * Centralizes auth logic to keep components clean.
 */

import { supabase } from '@/integrations/supabase/client';

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
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user ? { id: data.user.id, email: data.user.email ?? null } : undefined,
    };
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user ? { id: data.user.id, email: data.user.email ?? null } : undefined,
    };
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Sign out current user - sets offline status before logout
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user to set offline status
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Set user offline before signing out
      const now = new Date().toISOString();
      await supabase
        .from('user_status')
        .update({ is_online: false, last_seen: now, updated_at: now })
        .eq('user_id', user.id);
      
      // End any active chat sessions
      await supabase
        .from('active_chat_sessions')
        .update({ 
          status: 'ended', 
          ended_at: now,
          end_reason: 'user_logout'
        })
        .or(`man_user_id.eq.${user.id},woman_user_id.eq.${user.id}`)
        .eq('status', 'active');
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred' };
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
    callback(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
  });
}
