/**
 * ProtectedRoute - Route guard component
 * 
 * Ensures:
 * 1. User must be authenticated (session exists)
 * 2. User role must match the required role for the route
 * 3. After logout, back button / URL paste won't grant access
 * 
 * Roles: 'male' (men dashboard), 'female' (women dashboard), 'admin' (admin pages)
 */

import { useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type RequiredRole = 'male' | 'female' | 'admin' | 'authenticated';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: RequiredRole;
}

const ProtectedRoute = memo(({ children, requiredRole = 'authenticated' }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        // Use getSession to restore from localStorage (works on refresh)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) navigate('/', { replace: true });
          return;
        }

        // If only authentication is required (no specific role), allow access
        if (requiredRole === 'authenticated') {
          if (mounted) {
            setIsAuthorized(true);
            setIsChecking(false);
          }
          return;
        }

        const userId = session.user.id;

        // Fetch role data in parallel
        const [profileResult, femaleResult, adminResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('gender')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('female_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('role', 'admin')
            .maybeSingle(),
        ]);

        if (!mounted) return;

        const isAdmin = !!adminResult.data;
        const isFemale = profileResult.data?.gender?.toLowerCase() === 'female' || !!femaleResult.data;
        const isMale = !isFemale && !isAdmin;

        let authorized = false;
        let redirectTo = '/';

        switch (requiredRole) {
          case 'admin':
            authorized = isAdmin;
            // Non-admins go to their appropriate dashboard
            if (!authorized) {
              redirectTo = isFemale ? '/women-dashboard' : '/dashboard';
            }
            break;
          case 'female':
            authorized = isFemale && !isAdmin;
            if (!authorized) {
              redirectTo = isAdmin ? '/admin' : '/dashboard';
            }
            break;
          case 'male':
            authorized = isMale && !isAdmin;
            if (!authorized) {
              redirectTo = isAdmin ? '/admin' : isFemale ? '/women-dashboard' : '/dashboard';
            }
            break;
        }

        if (authorized) {
          setIsAuthorized(true);
          setIsChecking(false);
        } else {
          navigate(redirectTo, { replace: true });
        }
      } catch (error) {
        console.error('[ProtectedRoute] Access check error:', error);
        if (mounted) navigate('/', { replace: true });
      }
    };

    checkAccess();

    // Listen for auth changes (e.g., logout in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && mounted) {
        setIsAuthorized(false);
        navigate('/', { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, requiredRole]);

  if (isChecking || !isAuthorized) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
});

ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;
