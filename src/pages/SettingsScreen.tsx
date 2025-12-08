import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Settings, 
  Bell, 
  Globe, 
  Eye, 
  Palette,
  Moon,
  Sun,
  Monitor,
  Volume2,
  Vibrate,
  MessageSquare,
  Heart,
  Megaphone,
  Lock,
  Map,
  Languages,
  Save,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface UserSettings {
  theme: string;
  accent_color: string;
  notification_matches: boolean;
  notification_messages: boolean;
  notification_promotions: boolean;
  notification_sound: boolean;
  notification_vibration: boolean;
  language: string;
  auto_translate: boolean;
  show_online_status: boolean;
  show_read_receipts: boolean;
  profile_visibility: string;
  distance_unit: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  accent_color: "purple",
  notification_matches: true,
  notification_messages: true,
  notification_promotions: false,
  notification_sound: true,
  notification_vibration: true,
  language: "English",
  auto_translate: true,
  show_online_status: true,
  show_read_receipts: true,
  profile_visibility: "high",
  distance_unit: "km"
};

const ACCENT_COLORS = [
  { id: "purple", color: "hsl(262, 83%, 58%)", name: "Purple" },
  { id: "blue", color: "hsl(217, 91%, 60%)", name: "Blue" },
  { id: "green", color: "hsl(142, 71%, 45%)", name: "Green" },
  { id: "orange", color: "hsl(24, 95%, 53%)", name: "Orange" },
  { id: "pink", color: "hsl(330, 81%, 60%)", name: "Pink" },
  { id: "red", color: "hsl(0, 72%, 51%)", name: "Red" },
];

const THEME_OPTIONS = [
  { id: "light", icon: Sun, label: "Light" },
  { id: "dark", icon: Moon, label: "Dark" },
  { id: "system", icon: Monitor, label: "System" },
];

const SettingsScreen = () => {
  const navigate = useNavigate();
  const { t, setLanguage, currentLanguage, isLoading: isTranslating } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("eng_Latn");

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      let { data: settingsData, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!settingsData) {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        settingsData = newSettings;
      }

      const loadedSettings: UserSettings = {
        theme: settingsData.theme,
        accent_color: settingsData.accent_color,
        notification_matches: settingsData.notification_matches,
        notification_messages: settingsData.notification_messages,
        notification_promotions: settingsData.notification_promotions,
        notification_sound: settingsData.notification_sound,
        notification_vibration: settingsData.notification_vibration,
        language: settingsData.language,
        auto_translate: settingsData.auto_translate,
        show_online_status: settingsData.show_online_status,
        show_read_receipts: settingsData.show_read_receipts,
        profile_visibility: settingsData.profile_visibility,
        distance_unit: settingsData.distance_unit,
      };

      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Real-time subscription for settings updates
  useRealtimeSubscription({
    table: "user_settings",
    onUpdate: fetchSettings
  });

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_settings")
        .update(settings)
        .eq("user_id", user.id);

      if (error) throw error;

      setOriginalSettings(settings);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="auroraGhost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('settings', 'Settings')}
            </h1>
          </div>
          {hasChanges && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {t('unsavedChanges', 'Unsaved changes')}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Section 1: Appearance Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-primary" />
              {t('appearance', 'Appearance')}
            </CardTitle>
            <CardDescription>{t('customizeAppLooks', 'Customize how the app looks')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('theme', 'Theme')}</Label>
              <div className="grid grid-cols-3 gap-3">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => updateSetting("theme", option.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
                        settings.theme === option.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className={cn(
                        "h-6 w-6 mb-2",
                        settings.theme === option.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        settings.theme === option.id ? "text-primary" : "text-muted-foreground"
                      )}>
                        {t(option.id, option.label)}
                      </span>
                      {settings.theme === option.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Accent Color */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('accentColor', 'Accent Color')}</Label>
              <div className="flex gap-3 flex-wrap">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => updateSetting("accent_color", color.id)}
                    className={cn(
                      "w-10 h-10 rounded-full transition-all duration-200 relative",
                      settings.accent_color === color.id && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                    )}
                    style={{ backgroundColor: color.color }}
                    title={color.name}
                  >
                    {settings.accent_color === color.id && (
                      <CheckCircle2 className="h-5 w-5 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Notification Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              {t('notifications', 'Notifications')}
            </CardTitle>
            <CardDescription>{t('manageNotifications', 'Manage your notification preferences')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="notification-matches" className="cursor-pointer">{t('newMatches', 'New Matches')}</Label>
              </div>
              <Switch
                id="notification-matches"
                checked={settings.notification_matches}
                onCheckedChange={(checked) => updateSetting("notification_matches", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="notification-messages" className="cursor-pointer">{t('messages', 'Messages')}</Label>
              </div>
              <Switch
                id="notification-messages"
                checked={settings.notification_messages}
                onCheckedChange={(checked) => updateSetting("notification_messages", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="notification-promotions" className="cursor-pointer">{t('promotions', 'Promotions')}</Label>
              </div>
              <Switch
                id="notification-promotions"
                checked={settings.notification_promotions}
                onCheckedChange={(checked) => updateSetting("notification_promotions", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="notification-sound" className="cursor-pointer">{t('sound', 'Sound')}</Label>
              </div>
              <Switch
                id="notification-sound"
                checked={settings.notification_sound}
                onCheckedChange={(checked) => updateSetting("notification_sound", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="notification-vibration" className="cursor-pointer">{t('vibration', 'Vibration')}</Label>
              </div>
              <Switch
                id="notification-vibration"
                checked={settings.notification_vibration}
                onCheckedChange={(checked) => updateSetting("notification_vibration", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Language & Translation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              {t('languageRegion', 'Language & Region')}
            </CardTitle>
            <CardDescription>{t('setLanguagePreferences', 'Set your language and translation preferences')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LanguageSelector
              selectedLanguage={settings.language}
              selectedLanguageCode={selectedLanguageCode}
              onLanguageChange={(lang, code) => {
                updateSetting("language", lang);
                setSelectedLanguageCode(code);
                // Update app UI language
                setLanguage(lang);
              }}
              showAllLanguages={true}
              label={t('appLanguage', 'App Language')}
              description={t('languageDescription', 'Select your preferred language for the app interface')}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="auto-translate" className="cursor-pointer">{t('autoTranslateMessages', 'Auto-translate Messages')}</Label>
              </div>
              <Switch
                id="auto-translate"
                checked={settings.auto_translate}
                onCheckedChange={(checked) => updateSetting("auto_translate", checked)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Map className="h-4 w-4" />
                {t('distanceUnit', 'Distance Unit')}
              </Label>
              <Select
                value={settings.distance_unit}
                onValueChange={(value) => updateSetting("distance_unit", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select', 'Select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">{t('kilometers', 'Kilometers')} (km)</SelectItem>
                  <SelectItem value="miles">{t('miles', 'Miles')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Privacy Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-primary" />
              {t('privacy', 'Privacy')}
            </CardTitle>
            <CardDescription>{t('controlPrivacy', 'Control your privacy and visibility')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="show-online" className="cursor-pointer">{t('showOnlineStatus', 'Show Online Status')}</Label>
              </div>
              <Switch
                id="show-online"
                checked={settings.show_online_status}
                onCheckedChange={(checked) => updateSetting("show_online_status", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="read-receipts" className="cursor-pointer">{t('readReceipts', 'Read Receipts')}</Label>
              </div>
              <Switch
                id="read-receipts"
                checked={settings.show_read_receipts}
                onCheckedChange={(checked) => updateSetting("show_read_receipts", checked)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t('profileVisibility', 'Profile Visibility')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('controlProfileVisibility', 'Control how often your profile appears to others in search results')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "low", labelKey: "low", descKey: "rarelyShown", icon: "🔒" },
                  { value: "medium", labelKey: "medium", descKey: "sometimesShown", icon: "👁️" },
                  { value: "high", labelKey: "high", descKey: "oftenShown", icon: "⭐" },
                  { value: "very_high", labelKey: "veryHigh", descKey: "alwaysPrioritized", icon: "🔥" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSetting("profile_visibility", option.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 text-center",
                      settings.profile_visibility === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl mb-1">{option.icon}</span>
                    <span className={cn(
                      "text-sm font-medium",
                      settings.profile_visibility === option.value ? "text-primary" : "text-foreground"
                    )}>
                      {t(option.labelKey, option.labelKey.charAt(0).toUpperCase() + option.labelKey.slice(1))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t(option.descKey, option.descKey)}
                    </span>
                    {settings.profile_visibility === option.value && (
                      <CheckCircle2 className="h-4 w-4 text-primary mt-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Button */}
      <div className={cn(
        "fixed bottom-6 left-0 right-0 px-4 transition-all duration-300",
        hasChanges ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      )}>
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="w-full h-14 text-lg font-semibold shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {t('saving', 'Saving...')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                {t('saveChanges', 'Save Changes')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
