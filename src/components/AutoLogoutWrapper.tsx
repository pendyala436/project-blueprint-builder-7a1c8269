import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  const userIdRef = useRef<string | null>(null);

  // Check auth state and gender
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session?.user) {
        userIdRef.current = session.user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setIsFemale(profile?.gender?.toLowerCase() === 'female');
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        userIdRef.current = session.user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setIsFemale(profile?.gender?.toLowerCase() === 'female');
      } else {
        userIdRef.current = null;
        setIsFemale(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const idleTimeout = isFemale ? WOMEN_IDLE_TIMEOUT : MEN_IDLE_TIMEOUT;
  const idleMinutes = isFemale ? 45 : 15;

  const logout = useCallback(async () => {
    if (!isAuthenticated) return;
    
    console.log(`Auto-logout: User idle for ${idleMinutes} minutes`);
    
    const userId = userIdRef.current;
    if (userId) {
      // Set user offline
      await supabase
        .from('user_status')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('user_id', userId);
      
      // End any active chat sessions
      await supabase
        .from('active_chat_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          end_reason: `user_inactive_${idleMinutes}min`
        })
        .or(`man_user_id.eq.${userId},woman_user_id.eq.${userId}`)
        .eq('status', 'active');
    }
    
    toast.info(`You have been logged out due to ${idleMinutes} minutes of inactivity`);
    await supabase.auth.signOut();
    navigate('/');
  }, [navigate, isAuthenticated, idleMinutes]);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(logout, idleTimeout);
  }, [logout, isAuthenticated, idleTimeout]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimer();
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
  }, [resetTimer, isAuthenticated]);

  return <>{children}</>;
};

export default AutoLogoutWrapper;
