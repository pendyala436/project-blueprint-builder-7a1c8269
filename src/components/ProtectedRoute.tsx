import { toast } from "sonner";
/**
 * ProtectedRoute – single source of route guarding.
 *
 * Uses the global useAuthReady() hook so every component shares the same
 * session state. Role check runs once per mount (not on every token refresh).
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';
import { Loader2 } from 'lucide-react';

type RequiredRole = 'male' | 'female' | 'admin' | 'authenticated';

interface Props {
  children: React.ReactNode;
  requiredRole?: RequiredRole;
}

const ProtectedRoute = ({ children, requiredRole = 'authenticated' }: Props) => {
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const checkedForUser = useRef<string | null>(null);
  const REVALIDATE_INTERVAL_MS = 60_000; // Re-check role every 60s

  // Core role-check logic extracted for reuse
  const checkRole = async (userId: string, isRevalidation = false) => {
    const MAX_RETRIES = isRevalidation ? 1 : 3;
    let profileRes: any, femaleRes: any, adminRes: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeout = new Promise((_, rej) =>
          setTimeout(() => rej(new Error('timeout')), 8000)
        );
        const queries = Promise.all([
          supabase.from('profiles').select('gender').eq('user_id', userId).maybeSingle(),
          supabase.from('female_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
        ]);
        [profileRes, femaleRes, adminRes] = (await Promise.race([queries, timeout])) as any;
        break;
      } catch (retryErr) {
        if (attempt < MAX_RETRIES) {
          console.warn(`[ProtectedRoute] Role check attempt ${attempt} failed, retrying...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          throw retryErr;
        }
      }
    }

    const isAdmin = !!adminRes.data;
    const isFemale = profileRes.data?.gender?.toLowerCase() === 'female' || !!femaleRes.data;
    const isMale = !isFemale && !isAdmin;

    let ok = false;
    let to = '/';

    switch (requiredRole) {
      case 'admin':
        ok = isAdmin;
        if (!ok) to = isFemale ? '/women-dashboard' : '/dashboard';
        break;
      case 'female':
        ok = isFemale && !isAdmin;
        if (!ok) to = isAdmin ? '/admin' : '/dashboard';
        break;
      case 'male':
        ok = isMale && !isAdmin;
        if (!ok) to = isAdmin ? '/admin' : isFemale ? '/women-dashboard' : '/dashboard';
        break;
      case 'authenticated':
        ok = true;
        break;
    }

    return { ok, to };
  };

  // Initial role check on mount / user change
  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    if (checkedForUser.current === user.id) return;

    if (requiredRole === 'authenticated') {
      checkedForUser.current = user.id;
      setAuthorized(true);
      setChecking(false);
      return;
    }

    let mounted = true;
    setChecking(true);

    (async () => {
      try {
        const { ok, to } = await checkRole(user.id);
        if (!mounted) return;

        if (ok) {
          checkedForUser.current = user.id;
          setAuthorized(true);
        } else {
          navigate(to, { replace: true });
        }
      } catch (e) {
        console.error('[ProtectedRoute]', e);
        if (mounted) navigate('/', { replace: true });
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => { mounted = false; };
  }, [user?.id, isReady, requiredRole, navigate]);

  // Periodic re-validation: detect revoked roles while tab is open
  useEffect(() => {
    if (!authorized || !user || requiredRole === 'authenticated') return;

    const interval = setInterval(async () => {
      try {
        const { ok, to } = await checkRole(user.id, true);
        if (!ok) {
          console.warn(`[ProtectedRoute] Role revoked for user ${user.id}, redirecting`);
          checkedForUser.current = null;
          setAuthorized(false);
          toast.error('Your access permissions have changed. Redirecting...');
          navigate(to, { replace: true });
        }
      } catch {
        // Silently ignore transient network errors during revalidation
      }
    }, REVALIDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [authorized, user?.id, requiredRole, navigate]);

  // Sign-out listener + back-button guard for admin routes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        checkedForUser.current = null;
        setAuthorized(false);
        navigate('/', { replace: true });
      }
    });

    // Block browser back button from returning to protected pages after logout
    const handlePopState = () => {
      const s = isSignedOut();
      if (s) {
        window.history.replaceState(null, '', '/');
        navigate('/', { replace: true });
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  if (!isReady || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
};

export default ProtectedRoute;
