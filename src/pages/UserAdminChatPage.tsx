import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import NavHeader from "@/components/NavHeader";
import { UserAdminChat } from "@/components/UserAdminChat";
import { Shield } from "lucide-react";

const UserAdminChatPage = () => {
  const [currentUserId, setCurrentUserId] = useState("");
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: maleProfile } = await supabase
        .from("male_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (maleProfile?.full_name) {
        setUserName(maleProfile.full_name);
        return;
      }

      const { data: femaleProfile } = await supabase
        .from("female_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (femaleProfile?.full_name) {
        setUserName(femaleProfile.full_name);
      }
    };
    getUser();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <NavHeader
        title={
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Chat with Admin</h1>
          </div>
        }
        maxWidth="max-w-2xl"
      />
      <div className="max-w-2xl mx-auto p-4">
        {currentUserId ? (
          <UserAdminChat currentUserId={currentUserId} userName={userName} embedded />
        ) : (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        )}
      </div>
    </div>
  );
};

export default UserAdminChatPage;
