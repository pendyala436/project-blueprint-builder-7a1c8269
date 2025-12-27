import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

interface AutoLogoutWrapperProps {
  children: React.ReactNode;
}

export const AutoLogoutWrapper = ({ children }: AutoLogoutWrapperProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    if (!isAuthenticated) return;
    
    console.log('Auto-logout: User idle for 10 minutes');
    
    // Get current user to set offline status before logout
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Set user offline
      await supabase
        .from('user_status')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
      
      // End any active chat sessions
      await supabase
        .from('active_chat_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          end_reason: 'user_inactive_10min'
        })
        .or(`man_user_id.eq.${user.id},woman_user_id.eq.${user.id}`)
        .eq('status', 'active');
    }
    
    toast.info('You have been logged out due to 10 minutes of inactivity');
    await supabase.auth.signOut();
    navigate('/');
  }, [navigate, isAuthenticated]);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(logout, IDLE_TIMEOUT);
  }, [logout, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Reset timer on any activity
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    resetTimer();

    // Cleanup
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
