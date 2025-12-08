import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
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
  Users
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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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
  };

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
      const { data: { user } } = await supabase.auth.getUser();
      
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

        {/* Quick Links Section - Admin Management Tools */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Management Tools
            </CardTitle>
            <CardDescription>Quick access to user and data management features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => navigate('/admin/sample-users')} variant="outline" className="w-full justify-start gap-2">
              <Users className="h-4 w-4" />
              Sample Users Management
            </Button>
          </CardContent>
        </Card>

        {/* Mock Users Management */}
        <MockUsersCard />

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
                          ? 'bg-zinc-900 text-white' 
                          : theme.value === 'light' 
                            ? 'bg-white text-zinc-900' 
                            : 'bg-gradient-to-br from-white to-zinc-900'
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

// Mock Users Card Component
const MockUsersCard = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    enabled: boolean;
    count: number;
    languageCount: number;
    expectedCount: number;
  } | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("seed-sample-users", {
        body: { action: "status" },
      });

      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error("Error checking mock users status:", error);
    }
  };

  const toggleMockUsers = async () => {
    setLoading(true);
    try {
      const action = status?.enabled ? "clear" : "seed";
      
      toast({
        title: action === "seed" ? "Creating Mock Users" : "Removing Mock Users",
        description: action === "seed" 
          ? "Creating 3 men and 3 women per language. This may take a moment..."
          : "Removing all mock users...",
      });

      const { data, error } = await supabase.functions.invoke("seed-sample-users", {
        body: { action },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });

      await checkStatus();
    } catch (error: any) {
      console.error("Error toggling mock users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle mock users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Mock Users for Testing
        </CardTitle>
        <CardDescription>
          Enable mock users to test the platform with 3 men and 3 women per NLLB-200 language
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="space-y-1">
            <p className="font-medium">Mock Users</p>
            <p className="text-sm text-muted-foreground">
              {status?.enabled 
                ? `${status.count} mock users active (${status.languageCount} languages)`
                : "No mock users currently active"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={status?.enabled || false}
              onCheckedChange={toggleMockUsers}
              disabled={loading}
            />
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        
        {status?.enabled && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{status.count}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{status.languageCount}</p>
              <p className="text-xs text-muted-foreground">Languages</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">6</p>
              <p className="text-xs text-muted-foreground">Per Language</p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Note: Mock users are stored in the sample_users table and are separate from real auth users.
          Disable once testing is complete.
        </p>
      </CardContent>
    </Card>
  );
};

export default AdminSettings;