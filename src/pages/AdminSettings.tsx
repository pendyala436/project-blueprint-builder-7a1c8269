import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Save, 
  Settings, 
  Shield, 
  MessageSquare, 
  CreditCard, 
  Bell,
  BarChart3,
  Check,
  RefreshCw,
  Palette,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface AdminSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  setting_value: string;
  setting_type: string;
  category: string;
  description: string | null;
  updated_at: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  general: Settings,
  security: Shield,
  chat: MessageSquare,
  payment: CreditCard,
  notifications: Bell,
  analytics: BarChart3,
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  security: "Security",
  chat: "Chat",
  payment: "Payment",
  notifications: "Notifications",
  analytics: "Analytics",
};

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "hi", label: "Hindi" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

const AdminSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [modifiedSettings, setModifiedSettings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("general");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .order("category")
        .order("setting_name");

      if (error) throw error;
      setSettings((data as AdminSetting[]) || []);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Real-time subscription for settings
  useRealtimeSubscription({
    table: "admin_settings",
    onUpdate: loadSettings
  });

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSettingChange = (settingKey: string, value: string) => {
    setModifiedSettings(prev => ({
      ...prev,
      [settingKey]: value,
    }));
  };

  const getSettingValue = (setting: AdminSetting): string => {
    return modifiedSettings[setting.setting_key] ?? setting.setting_value;
  };

  const saveSettings = async () => {
    if (Object.keys(modifiedSettings).length === 0) {
      toast({
        title: "No changes",
        description: "No settings have been modified",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
        navigate("/");
        return;
      }
      const user = session.user;
      for (const [key, value] of Object.entries(modifiedSettings)) {
        const { error } = await supabase
          .from("admin_settings")
          .update({ 
            setting_value: value,
            last_updated_by: user?.id 
          })
          .eq("setting_key", key);

        if (error) throw error;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      toast({
        title: "Settings saved",
        description: `${Object.keys(modifiedSettings).length} setting(s) updated successfully`,
      });

      setModifiedSettings({});
      loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(s => s.category === category);
  };

  const categories = [...new Set(settings.map(s => s.category))];

  const renderSettingInput = (setting: AdminSetting) => {
    const value = getSettingValue(setting);
    const isModified = modifiedSettings[setting.setting_key] !== undefined;

    switch (setting.setting_type) {
      case "boolean":
        return (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">{setting.setting_name}</Label>
              {setting.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{setting.description}</p>
              )}
            </div>
            <Switch
              checked={value === "true"}
              onCheckedChange={(checked) => handleSettingChange(setting.setting_key, checked.toString())}
              className={isModified ? "ring-2 ring-primary ring-offset-2" : ""}
            />
          </div>
        );

      case "select":
        const options = setting.setting_key === "default_theme" ? THEME_OPTIONS : 
                       setting.setting_key === "default_language" ? LANGUAGE_OPTIONS : 
                       [];
        return (
          <div className="space-y-2">
            <Label className="text-foreground font-medium">{setting.setting_name}</Label>
            {setting.description && (
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            )}
            <Select value={value} onValueChange={(v) => handleSettingChange(setting.setting_key, v)}>
              <SelectTrigger className={`w-full bg-background ${isModified ? "ring-2 ring-primary" : ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "number":
        return (
          <div className="space-y-2">
            <Label className="text-foreground font-medium">{setting.setting_name}</Label>
            {setting.description && (
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            )}
            <Input
              type="number"
              value={value}
              onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
              className={`bg-background ${isModified ? "ring-2 ring-primary" : ""}`}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label className="text-foreground font-medium">{setting.setting_name}</Label>
            {setting.description && (
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            )}
            <Input
              type="text"
              value={value}
              onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
              className={`bg-background ${isModified ? "ring-2 ring-primary" : ""}`}
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AdminNav>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Admin Settings
            </h1>
            <p className="text-muted-foreground">Configure global app settings and policies</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={loadSettings}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              onClick={saveSettings} 
              disabled={saving || Object.keys(modifiedSettings).length === 0}
              className={`gap-2 transition-all duration-300 ${saveSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
              {Object.keys(modifiedSettings).length > 0 && !saveSuccess && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-foreground/20 rounded">
                  {Object.keys(modifiedSettings).length}
                </span>
              )}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-6 bg-muted/50">
            {categories.map(category => {
              const Icon = CATEGORY_ICONS[category] || Settings;
              const count = getSettingsByCategory(category).length;
              const modifiedCount = getSettingsByCategory(category).filter(
                s => modifiedSettings[s.setting_key] !== undefined
              ).length;
              
              return (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="gap-2 relative data-[state=active]:bg-background"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{CATEGORY_LABELS[category]}</span>
                  {modifiedCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                      {modifiedCount}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const Icon = CATEGORY_ICONS[category] || Settings;
                      return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                    {CATEGORY_LABELS[category]} Settings
                  </CardTitle>
                  <CardDescription>
                    Configure {CATEGORY_LABELS[category].toLowerCase()} related options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {getSettingsByCategory(category).map(setting => (
                    <div 
                      key={setting.id} 
                      className={`p-4 rounded-lg border transition-all ${
                        modifiedSettings[setting.setting_key] !== undefined 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-card'
                      }`}
                    >
                      {renderSettingInput(setting)}
                      <p className="text-xs text-muted-foreground mt-2">
                        Last updated: {new Date(setting.updated_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <AdminVideoGroupControls />

        {/* Development Tools section removed - only real users supported */}

        {/* Theme Preview - Only show in General tab */}
        {activeTab === "general" && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Theme Preview
              </CardTitle>
              <CardDescription>Preview how the selected theme will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {THEME_OPTIONS.map(theme => {
                  const isSelected = getSettingValue(
                    settings.find(s => s.setting_key === "default_theme") || {} as AdminSetting
                  ) === theme.value;
                  
                  return (
                    <div
                      key={theme.value}
                      onClick={() => handleSettingChange("default_theme", theme.value)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      } ${
                        theme.value === 'dark' 
                          ? 'bg-card text-foreground' 
                          : theme.value === 'light' 
                            ? 'bg-background text-foreground' 
                            : 'bg-gradient-to-br from-background to-card'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{theme.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="space-y-2">
                        <div className={`h-2 rounded ${theme.value === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                        <div className={`h-2 rounded w-3/4 ${theme.value === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                        <div className={`h-2 rounded w-1/2 ${theme.value === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminNav>
  );
};

// ─── Admin Video & Group Controls Component ───
const AdminVideoGroupControls = () => {
  const [videoCallsDisabled, setVideoCallsDisabled] = useState(false);
  const [breakerActive, setBreakerActive] = useState(false);
  const [breakerReason, setBreakerReason] = useState("");
  const [breakerResumesAt, setBreakerResumesAt] = useState("");
  const [privateGroupCount, setPrivateGroupCount] = useState(10);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current state
  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      // Check circuit breaker status
      const { data: cbData } = await supabase.functions.invoke('video-call-circuit-breaker', {
        body: { action: 'check_status' },
      });
      setBreakerActive(cbData?.active ?? false);
      setBreakerReason(cbData?.reason ?? '');
      setBreakerResumesAt(cbData?.resumes_at ?? '');

      // Check permanent disable flag
      const { data: disableSetting } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'video_calls_permanently_disabled')
        .maybeSingle();
      if (disableSetting) {
        const val = typeof disableSetting.setting_value === 'string'
          ? JSON.parse(disableSetting.setting_value)
          : disableSetting.setting_value;
        setVideoCallsDisabled(val?.disabled ?? false);
      }

      // Check private group count
      const { data: groupSetting } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'private_group_max_count')
        .maybeSingle();
      if (groupSetting) {
        const val = typeof groupSetting.setting_value === 'string'
          ? JSON.parse(groupSetting.setting_value)
          : groupSetting.setting_value;
        setPrivateGroupCount(typeof val === 'number' ? val : (val?.count ?? 10));
      }
    } catch (err) {
      console.error('Error loading video/group settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadState(); }, [loadState]);

  // Stop all active video calls immediately
  const handleStopAllCalls = async () => {
    setLoadingAction('stop_all');
    try {
      const { data } = await supabase.functions.invoke('video-call-circuit-breaker', {
        body: { action: 'report_high_utilization', cpu_percent: 100, memory_percent: 100, source: 'admin_manual' },
      });
      toast({
        title: "All Video Calls Stopped",
        description: `${data?.terminated_calls ?? 0} active call(s) terminated. New calls blocked for 2 hours.`,
      });
      setBreakerActive(true);
      setBreakerResumesAt(data?.resumes_at ?? '');
    } catch (err) {
      toast({ title: "Error", description: "Failed to stop calls", variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  // Reset circuit breaker
  const handleResetBreaker = async () => {
    setLoadingAction('reset_breaker');
    try {
      await supabase.functions.invoke('video-call-circuit-breaker', {
        body: { action: 'reset' },
      });
      toast({ title: "Circuit Breaker Reset", description: "Video calls are now allowed again." });
      setBreakerActive(false);
    } catch (err) {
      toast({ title: "Error", description: "Failed to reset", variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  // Toggle permanent disable
  const handleTogglePermanentDisable = async (disabled: boolean) => {
    setLoadingAction('toggle_permanent');
    try {
      await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'video_calls_permanently_disabled',
          setting_value: JSON.stringify({ disabled, updated_at: new Date().toISOString() }),
          setting_type: 'json',
          category: 'system',
          description: 'Permanently disable all video calls',
          is_public: true,
        }, { onConflict: 'setting_key' });

      setVideoCallsDisabled(disabled);

      if (disabled) {
        // Also stop all active calls
        await supabase.functions.invoke('video-call-circuit-breaker', {
          body: { action: 'report_high_utilization', cpu_percent: 100, memory_percent: 100, source: 'admin_permanent_disable' },
        });
      }

      toast({
        title: disabled ? "Video Calls Disabled" : "Video Calls Enabled",
        description: disabled
          ? "All video calls are now permanently disabled until you re-enable them."
          : "Video calls are now enabled for all users.",
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  // Update private group count
  const handleGroupCountChange = async (count: number) => {
    setPrivateGroupCount(count);
  };

  const handleGroupCountSave = async () => {
    setLoadingAction('save_groups');
    try {
      await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'private_group_max_count',
          setting_value: JSON.stringify({ count: privateGroupCount, updated_at: new Date().toISOString() }),
          setting_type: 'json',
          category: 'system',
          description: 'Maximum number of private groups (flower rooms) allowed (2-50)',
          is_public: true,
        }, { onConflict: 'setting_key' });

      toast({
        title: "Private Groups Updated",
        description: `Maximum private groups set to ${privateGroupCount}`,
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Video Calls & Private Groups
        </CardTitle>
        <CardDescription>Emergency controls for video calls and group management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Circuit Breaker Status */}
        {breakerActive && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Circuit Breaker Active</p>
              <p className="text-xs text-muted-foreground">
                {breakerReason && `Reason: ${breakerReason}. `}
                {breakerResumesAt && `Auto-resumes: ${new Date(breakerResumesAt).toLocaleString()}`}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetBreaker}
              disabled={loadingAction === 'reset_breaker'}
              className="shrink-0"
            >
              {loadingAction === 'reset_breaker' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reset"}
            </Button>
          </div>
        )}

        {/* Stop All Calls */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
          <div>
            <Label className="text-foreground font-medium flex items-center gap-2">
              <PhoneOff className="h-4 w-4 text-destructive" />
              Stop All Active Video Calls
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Immediately end all ongoing video calls and block new ones for 2 hours
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStopAllCalls}
            disabled={!!loadingAction}
            className="gap-1.5 shrink-0"
          >
            {loadingAction === 'stop_all' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneOff className="h-4 w-4" />
            )}
            Stop All
          </Button>
        </div>

        {/* Permanent Disable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
          <div>
            <Label className="text-foreground font-medium flex items-center gap-2">
              <VideoOff className="h-4 w-4 text-warning" />
              Permanently Disable Video Calls
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Disable all video calls until you manually re-enable
            </p>
          </div>
          <Switch
            checked={videoCallsDisabled}
            onCheckedChange={handleTogglePermanentDisable}
            disabled={!!loadingAction}
          />
        </div>

        {/* Private Group Count */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-4">
          <div>
            <Label className="text-foreground font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Maximum Private Groups (Flower Rooms)
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set the number of private group rooms available (min: 2, max: 50)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-6">2</span>
            <Slider
              value={[privateGroupCount]}
              onValueChange={([v]) => handleGroupCountChange(v)}
              min={2}
              max={50}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-6">50</span>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-sm">
              Current: {privateGroupCount} rooms
            </Badge>
            <Button
              size="sm"
              onClick={handleGroupCountSave}
              disabled={!!loadingAction}
              className="gap-1.5"
            >
              {loadingAction === 'save_groups' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mock Users Card Component removed - only real authenticated users are supported

export default AdminSettings;