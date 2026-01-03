import { useNavigate } from "react-router-dom";
import { Settings, Home } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { SettingsPanel } from "@/components/SettingsPanel";
import NavigationHeader from "@/components/NavigationHeader";

const SettingsScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-md mx-auto px-4 py-2">
          <NavigationHeader
            title={t('settings', 'Settings')}
            showBack={true}
            showHome={true}
            showForward={false}
            rightContent={<Settings className="h-5 w-5 text-muted-foreground" />}
          />
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        <SettingsPanel />
      </div>
    </div>
  );
};

export default SettingsScreen;
