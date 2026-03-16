import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ADMIN_CHECK_TIMEOUT = 10000; // 10 seconds max

export const useAdminAccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [userId, setUserId] = useState("");
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkAdminAccess = async () => {
      // Safety timeout to prevent stuck loading
      timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
          console.warn('[useAdminAccess] Admin check timed out');
          setIsLoading(false);
          navigate("/");
        }
      }, ADMIN_CHECK_TIMEOUT);

      try {
        // Use getSession() to restore from localStorage first (prevents refresh logout)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (!session?.user) {
          clearTimeout(timeoutId);
          navigate("/");
          return;
        }
        const user = session.user;

        setAdminEmail(user.email || "");
        setUserId(user.id);

        // Check if user has admin role - with retry for DB timeouts
        let roleData: any = null;
        let roleError: any = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          const result = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle();
          
          roleData = result.data;
          roleError = result.error;
          
          if (!roleError || attempt === 3) break;
          console.warn(`[useAdminAccess] Role check attempt ${attempt} failed, retrying...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }

        if (!mounted) return;
        clearTimeout(timeoutId);

        if (roleError) {
          console.error("[useAdminAccess] Role check error:", roleError);
        }

        if (!roleData) {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges",
            variant: "destructive"
          });
          navigate("/dashboard");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin access:", error);
      toast({ title: "Access check failed", description: "Unable to verify your admin access. Please refresh the page.", variant: "destructive" });
        if (mounted) navigate("/");
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    };

    checkAdminAccess();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [navigate, toast]);

  return { isLoading, isAdmin, adminEmail, userId };
};
