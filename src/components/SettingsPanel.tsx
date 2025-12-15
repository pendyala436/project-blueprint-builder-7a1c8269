import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Bell, 
  Globe, 
  Eye, 
  Palette,
  Volume2,
  Vibrate,
  MessageSquare,
  Heart,
  Megaphone,
  Lock,
  Map,
  Save,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { ThemeSelector } from "@/components/ThemeSelector";

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

interface SettingsPanelProps {
  compact?: boolean;
}

export const SettingsPanel = ({ compact = false }: SettingsPanelProps) => {
  const navigate = useNavigate();
  const { t, setLanguage } = useTranslation();
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
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {/* Appearance Settings */}
      <Card>
        <CardHeader className={cn("pb-3", compact && "py-3 px-4")}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            {t('appearance', 'Appearance')}
          </CardTitle>
          <CardDescription>{t('customizeAppLooks', 'Customize how the app looks with 20 beautiful themes')}</CardDescription>
        </CardHeader>
        <CardContent className={compact ? "px-4 pb-4" : undefined}>
          <ThemeSelector compact />
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader className={cn("pb-3", compact && "py-3 px-4")}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            {t('notifications', 'Notifications')}
          </CardTitle>
          <CardDescription>{t('manageNotifications', 'Manage your notification preferences')}</CardDescription>
        </CardHeader>
        <CardContent className={cn("space-y-4", compact && "px-4 pb-4")}>
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

      {/* Language & Translation */}
      <Card>
        <CardHeader className={cn("pb-3", compact && "py-3 px-4")}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            {t('languageRegion', 'Language & Region')}
          </CardTitle>
          <CardDescription>{t('setLanguagePreferences', 'Set your language and translation preferences')}</CardDescription>
        </CardHeader>
        <CardContent className={cn("space-y-4", compact && "px-4 pb-4")}>
          <LanguageSelector
            selectedLanguage={settings.language}
            selectedLanguageCode={selectedLanguageCode}
            onLanguageChange={(lang, code) => {
              updateSetting("language", lang);
              setSelectedLanguageCode(code);
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

      {/* Privacy Settings */}
      <Card>
        <CardHeader className={cn("pb-3", compact && "py-3 px-4")}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            {t('privacy', 'Privacy')}
          </CardTitle>
          <CardDescription>{t('controlPrivacy', 'Control your privacy and visibility')}</CardDescription>
        </CardHeader>
        <CardContent className={cn("space-y-4", compact && "px-4 pb-4")}>
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
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-20 z-40 flex justify-center pb-4">
          <Button
            variant="aurora"
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="shadow-glow gap-2 min-w-[200px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('saving', 'Saving...')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('saveChanges', 'Save Changes')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
