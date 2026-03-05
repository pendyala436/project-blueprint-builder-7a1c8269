import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NavHeader from "@/components/NavHeader";
import { AdminMessagesWidget } from "@/components/AdminMessagesWidget";
import { Mail } from "lucide-react";

const UserAdminMessagesPage = () => {
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <NavHeader
        title={
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Admin Messages</h1>
          </div>
        }
        maxWidth="max-w-2xl"
      />
      <div className="max-w-2xl mx-auto p-4">
        {currentUserId ? (
          <AdminMessagesWidget currentUserId={currentUserId} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        )}
      </div>
    </div>
  );
};

export default UserAdminMessagesPage;
