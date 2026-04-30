/**
 * AdminEnableDisable — Global feature visibility toggles.
 * Currently controls: Statements tab visibility inside user wallet screens.
 * Wallet balance and recharge are NEVER affected by these toggles.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Eye, EyeOff } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

const AdminEnableDisable = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, isLoading, refetch } = useAppSettings();
  const [statementsVisible, setStatementsVisible] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatementsVisible(!!settings.statementsTabVisible);
  }, [settings.statementsTabVisible]);

  const handleToggle = async (next: boolean) => {
    setSaving(true);
    setStatementsVisible(next); // optimistic
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          {
            setting_key: "statements_tab_visible",
            setting_value: next as unknown as any,
            setting_type: "json",
            is_public: true,
            description:
              "Controls visibility of Statements tab in user wallet screens (men & women). Hidden by default.",
          },
          { onConflict: "setting_key" }
        );
      if (error) throw error;
      toast({
        title: next ? "Statements tab enabled" : "Statements tab hidden",
        description: next
          ? "All users can now see the Statements tab inside their wallet."
          : "Statements tab is now hidden for all users. Wallet balance and recharge remain unaffected.",
      });
      await refetch();
    } catch (err: any) {
      setStatementsVisible(!next); // revert
      toast({
        title: "Failed to update setting",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold flex-1">Enable / Disable Features</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-base">Statements Tab (Wallet)</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Show or hide the Statements tab inside user wallet screens for all users
                      (men &amp; women).
                    </p>
                  </div>
                  <Switch
                    checked={statementsVisible}
                    disabled={saving}
                    onCheckedChange={handleToggle}
                    aria-label="Toggle Statements tab visibility"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs">
                  {statementsVisible ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-green-700 dark:text-green-400 font-medium">
                        Visible to all users
                      </span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">
                        Hidden for all users
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> Wallet balance and recharge
                  functionality always remain active and are never affected by this toggle. Only
                  the Statements tab visibility is controlled here.
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminEnableDisable;
