import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthScreen from "./AuthScreen";

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check profile completion
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, verification_status")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profile?.verification_status) {
          navigate("/dashboard");
        } else if (profile?.full_name) {
          navigate("/photo-upload");
        } else {
          navigate("/basic-info");
        }
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <AuthScreen />;
};

export default Index;
