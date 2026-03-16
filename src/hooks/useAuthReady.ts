/**
 * Global singleton auth state hook.
 * 
 * Pattern: getSession() first, then onAuthStateChange for subsequent changes.
 * All components share one auth state — no conflicting session checks.
 */
import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearUserContextCache } from '@/hooks/useOptimizedAuth';

// Extend Window to track sign-out globally for back-button guard
declare global {
  // eslint-disable-next-line no-var
  var __supabaseSignedOut: boolean;
}
globalThis.__supabaseSignedOut = false;

interface AuthState {
  user: User | null;
  isReady: boolean;
  session: Session | null;
}

// ── Global singleton state ──────────────────────────────────────────
let globalState: AuthState = { user: null, isReady: false, session: null };
let listeners = new Set<(s: AuthState) => void>();
let initialized = false;

function broadcast(next: AuthState) {
  globalState = next;
  listeners.forEach(fn => fn(next));
}

function boot() {
  if (initialized) return;
  initialized = true;

  // 1) Restore session from storage FIRST — with timeout to prevent hanging
  const sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => {
    broadcast({ user: session?.user ?? null, session, isReady: true });
  }).catch(() => {
    broadcast({ user: null, session: null, isReady: true });
  });

  // Safety timeout: if Supabase is unreachable, don't block the UI forever
  const timeout = setTimeout(() => {
    if (!globalState.isReady) {
      console.warn('[Auth] Session restore timed out after 5s, proceeding without session');
      broadcast({ user: null, session: null, isReady: true });
    }
  }, 5000);

  sessionPromise.finally(() => clearTimeout(timeout));

  // 2) Listen for subsequent changes (sign-in, sign-out, token refresh)
  //    IMPORTANT: no async work inside this callback
  supabase.auth.onAuthStateChange((_event, session) => {
    if (_event === 'SIGNED_OUT') {
      globalThis.__supabaseSignedOut = true;
      clearUserContextCache();
    } else if (session?.user) {
      globalThis.__supabaseSignedOut = false;
    }
    broadcast({ user: session?.user ?? null, session, isReady: true });
  });
}

// ── Hook ────────────────────────────────────────────────────────────
export function useAuthReady() {
  const [state, setState] = useState<AuthState>(globalState);
  const stateRef = useRef(state);

  useEffect(() => {
    const listener = (next: AuthState) => {
      // Only re-render if user id or isReady actually changed
      const prev = stateRef.current;
      if (prev.isReady === next.isReady && prev.user?.id === next.user?.id) return;
      stateRef.current = next;
      setState(next);
    };

    listeners.add(listener);
    boot(); // no-op if already initialised

    // Sync with current global state in case boot() already finished
    if (globalState.isReady && !stateRef.current.isReady) {
      stateRef.current = globalState;
      setState(globalState);
    }

    return () => { listeners.delete(listener); };
  }, []);

  return { user: state.user, isReady: state.isReady, session: state.session };
}
