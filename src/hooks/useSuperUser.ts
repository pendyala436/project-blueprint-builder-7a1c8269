import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Super User Detection Hook
 * 
 * Super users are identified by email pattern:
 * - female1-15@meow-meow.com
 * - male1-15@meow-meow.com  
 * - admin1-15@meow-meow.com
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

  // Super user email patterns
  const SUPER_USER_PATTERNS = {
    female: /^female([1-9]|1[0-5])@meow-meow\.com$/,
    male: /^male([1-9]|1[0-5])@meow-meow\.com$/,
    admin: /^admin([1-9]|1[0-5])@meow-meow\.com$/,
  };

  /**
   * Check if an email matches super user pattern
   */
  const isSuperUserEmail = useCallback((email: string): boolean => {
    if (!email) return false;
    const lowerEmail = email.toLowerCase();
    return (
      SUPER_USER_PATTERNS.female.test(lowerEmail) ||
      SUPER_USER_PATTERNS.male.test(lowerEmail) ||
      SUPER_USER_PATTERNS.admin.test(lowerEmail)
    );
  }, []);

  /**
   * Get the type of super user from email
   */
  const getSuperUserType = useCallback((email: string): 'male' | 'female' | 'admin' | null => {
    if (!email) return null;
    const lowerEmail = email.toLowerCase();
    
    if (SUPER_USER_PATTERNS.admin.test(lowerEmail)) return 'admin';
    if (SUPER_USER_PATTERNS.female.test(lowerEmail)) return 'female';
    if (SUPER_USER_PATTERNS.male.test(lowerEmail)) return 'male';
    
    return null;
  }, []);

  /**
   * Check if super user should bypass balance requirements
   */
  const shouldBypassBalance = useCallback((email: string): boolean => {
    return isSuperUserEmail(email);
  }, [isSuperUserEmail]);

  /**
   * Check if super user should skip auto-connection
   * Super users manually connect to chats
   */
  const shouldSkipAutoConnect = useCallback((email: string): boolean => {
    return isSuperUserEmail(email);
  }, [isSuperUserEmail]);

  /**
   * Check if user can do silent monitoring
   */
  const canSilentMonitor = useCallback((email: string): boolean => {
    return isSuperUserEmail(email);
  }, [isSuperUserEmail]);

  /**
   * Check current user's super status on mount
   */
  useEffect(() => {
    const checkSuperStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          const isSuper = isSuperUserEmail(user.email);
          const type = getSuperUserType(user.email);
          
          setIsSuperUser(isSuper);
          setSuperUserType(type);
          setIsAdmin(type === 'admin');
        }
      } catch (error) {
        console.error('Error checking super user status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user?.email) {
        const isSuper = isSuperUserEmail(session.user.email);
        const type = getSuperUserType(session.user.email);
        
        setIsSuperUser(isSuper);
        setSuperUserType(type);
        setIsAdmin(type === 'admin');
      } else {
        setIsSuperUser(false);
        setSuperUserType(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isSuperUserEmail, getSuperUserType]);

  return {
    isSuperUser,
    isAdmin,
    superUserType,
    isLoading,
    isSuperUserEmail,
    getSuperUserType,
    shouldBypassBalance,
    shouldSkipAutoConnect,
    canSilentMonitor,
  };
};

export default useSuperUser;
