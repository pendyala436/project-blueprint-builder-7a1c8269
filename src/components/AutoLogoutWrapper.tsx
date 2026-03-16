import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthReady } from '@/hooks/useAuthReady';

const MEN_IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WOMEN_IDLE_TIMEOUT = 45 * 60 * 1000; // 45 minutes

interface AutoLogoutWrapperProps {
  children: React.ReactNode;
}

export const AutoLogoutWrapper = ({ children }: AutoLogoutWrapperProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFemale, setIsFemale] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const profileFetchedRef = useRef(false);

  // Use centralized auth state instead of independent getSession calls
  const { user: authUser, isReady: authReady } = useAuthReady();
  
  useEffect(() => {
    if (!authReady) return;
    let mounted = true;
    
    setIsAuthenticated(!!authUser);
    setIsReady(true);
    
    if (authUser && !profileFetchedRef.current) {
      userIdRef.current = authUser.id;
      profileFetchedRef.current = true;
      
      void (async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('gender')
            .eq('user_id', authUser.id)
            .maybeSingle();
          if (mounted) {
            setIsFemale(profile?.gender?.toLowerCase() === 'female');
          }
        } catch {
          // Ignore profile fetch errors
        }
      })();
    } else if (!authUser) {
      userIdRef.current = null;
      profileFetchedRef.current = false;
      setIsFemale(false);
    }

    return () => { mounted = false; };
  }, [authUser, authReady]);

  const idleTimeout = isFemale ? WOMEN_IDLE_TIMEOUT : MEN_IDLE_TIMEOUT;
  const idleMinutes = isFemale ? 45 : 15;

  const logout = useCallback(async () => {
    if (!isAuthenticated) return;

    console.log(`Auto-logout: User idle for ${idleMinutes} minutes`);

    try {
      // Use userIdRef or fall back to Supabase session uid
      const { data: { session } } = await supabase.auth.getSession();
      const uid = userIdRef.current || session?.user?.id || '';
      if (uid) {
        const { cleanupAllUserSessions } = await import('@/services/session-cleanup.service');
        await cleanupAllUserSessions(uid);
      }
    } catch (err) {
      console.warn('[AutoLogoutWrapper] Session cleanup failed:', err);
    }

    toast.info(`You have been logged out due to ${idleMinutes} minutes of inactivity`);
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  }, [navigate, isAuthenticated, idleMinutes]);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated || !isReady) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(logout, idleTimeout);
  }, [logout, isAuthenticated, isReady, idleTimeout]);

  useEffect(() => {
    if (!isAuthenticated || !isReady) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle activity events
    let lastEventTime = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastEventTime > 5000) { // 5s throttle
        lastEventTime = now;
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, isAuthenticated, isReady]);

  return <>{children}</>;
};

export default AutoLogoutWrapper;
