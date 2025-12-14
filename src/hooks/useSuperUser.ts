import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Super User Detection Hook
 * 
 * SECURITY: Super user status is now verified via server-side role checks
 * using the user_roles table, not email patterns.
 * 
 * Super users have:
 * - No balance requirements for chat
 * - No auto-connection (manual connect only)
 * - Ability to monitor chats silently
 * - Admin users have full admin access
 */
export const useSuperUser = () => {
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [superUserType, setSuperUserType] = useState<'male' | 'female' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * SECURITY: Check super user status via server-side role lookup
   * This prevents client-side manipulation of super user detection
   */
  const checkUserRoles = useCallback(async (userId: string): Promise<{
    isSuperUser: boolean;
    isAdmin: boolean;
    type: 'male' | 'female' | 'admin' | null;
  }> => {
    try {
      // Check for admin role in user_roles table (server-validated)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const hasAdminRole = roles?.some(r => r.role === 'admin') || false;

      // For super user type, we check profile gender (only if they have special role)
      if (hasAdminRole) {
        return { isSuperUser: true, isAdmin: true, type: 'admin' };
      }

      // Check if user has super_user role (if you add this role later)
      const hasSuperRole = roles?.some(r => r.role === 'super_user' as any) || false;
      
      if (hasSuperRole) {
        // Get gender from profile to determine type
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender')
          .eq('user_id', userId)
          .maybeSingle();
        
        const type = profile?.gender === 'female' ? 'female' : 'male';
        return { isSuperUser: true, isAdmin: false, type };
      }

      return { isSuperUser: false, isAdmin: false, type: null };
    } catch (error) {
      console.error('Error checking user roles:', error);
      return { isSuperUser: false, isAdmin: false, type: null };
    }
  }, []);

  /**
   * DEPRECATED: Email-based check - kept for backward compatibility but 
   * should not be trusted for security decisions
   */
  const isSuperUserEmail = useCallback((email: string): boolean => {
    console.warn('[SECURITY] isSuperUserEmail is deprecated. Use server-side role checks.');
    // Return false - force use of server-side validation
    return false;
  }, []);

  /**
   * DEPRECATED: Use server-side role checks instead
   */
  const getSuperUserType = useCallback((email: string): 'male' | 'female' | 'admin' | null => {
    console.warn('[SECURITY] getSuperUserType is deprecated. Use server-side role checks.');
    return null;
  }, []);

  /**
   * Check if user should bypass balance - now server-side validated
   */
  const shouldBypassBalance = useCallback(async (userId: string): Promise<boolean> => {
    const result = await checkUserRoles(userId);
    return result.isSuperUser;
  }, [checkUserRoles]);

  /**
   * Check if super user should skip auto-connection
   */
  const shouldSkipAutoConnect = useCallback(async (userId: string): Promise<boolean> => {
    const result = await checkUserRoles(userId);
    return result.isSuperUser;
  }, [checkUserRoles]);

  /**
   * Check if user can do silent monitoring
   */
  const canSilentMonitor = useCallback(async (userId: string): Promise<boolean> => {
    const result = await checkUserRoles(userId);
    return result.isSuperUser;
  }, [checkUserRoles]);

  /**
   * Check current user's super status on mount via server-side validation
   */
  useEffect(() => {
    const checkSuperStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          const result = await checkUserRoles(user.id);
          setIsSuperUser(result.isSuperUser);
          setSuperUserType(result.type);
          setIsAdmin(result.isAdmin);
        }
      } catch (error) {
        console.error('Error checking super user status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user?.id) {
        const result = await checkUserRoles(session.user.id);
        setIsSuperUser(result.isSuperUser);
        setSuperUserType(result.type);
        setIsAdmin(result.isAdmin);
      } else {
        setIsSuperUser(false);
        setSuperUserType(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkUserRoles]);

  return {
    isSuperUser,
    isAdmin,
    superUserType,
    isLoading,
    // Keep deprecated methods for API compatibility but they now return safe defaults
    isSuperUserEmail,
    getSuperUserType,
    shouldBypassBalance,
    shouldSkipAutoConnect,
    canSilentMonitor,
  };
};

export default useSuperUser;
