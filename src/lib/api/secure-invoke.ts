/**
 * Secure Edge Function Invocation
 * 
 * Validates session before invoking edge functions to prevent 401 errors
 * that can cause blank screens when session is expired/invalid.
 */

import { supabase } from "@/integrations/supabase/client";

interface InvokeOptions {
  body?: Record<string, unknown>;
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

/**
 * Safely invoke an edge function with session validation
 * Returns early with error if no valid session exists
 */
export async function secureInvoke<T = unknown>(
  functionName: string,
  options?: InvokeOptions
): Promise<InvokeResult<T>> {
  try {
    // Check for valid session first
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData?.session?.access_token) {
      console.warn(`[secureInvoke] No valid session for ${functionName}, skipping call`);
      return {
        data: null,
        error: new Error("No valid session")
      };
    }

    // Session is valid, proceed with the call
    const { data, error } = await supabase.functions.invoke<T>(functionName, options);

    if (error) {
      // Handle 401 specifically - session may have expired between check and call
      if (error.message?.includes("401") || error.message?.includes("Invalid or expired token")) {
        console.warn(`[secureInvoke] Session expired during ${functionName} call`);
        return {
          data: null,
          error: new Error("Session expired")
        };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error(`[secureInvoke] Error invoking ${functionName}:`, err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

/**
 * Check if user has a valid authenticated session
 */
export async function hasValidSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data?.session?.access_token;
  } catch {
    return false;
  }
}
