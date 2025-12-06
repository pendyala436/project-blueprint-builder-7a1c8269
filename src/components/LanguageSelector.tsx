import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Languages, Search, Check, ChevronDown, Globe, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  ALL_NLLB200_LANGUAGES, 
  INDIAN_NLLB200_LANGUAGES, 
  NON_INDIAN_NLLB200_LANGUAGES,
  NLLB200Language,
  getTotalLanguageCount
} from "@/data/nllb200Languages";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LanguageSelectorProps {
  selectedLanguage: string;
  selectedLanguageCode?: string;
  onLanguageChange: (language: string, code: string) => void;
  showAllLanguages?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export const LanguageSelector = ({
  selectedLanguage,
  selectedLanguageCode,
  onLanguageChange,
  showAllLanguages = true,
  label = "Your Language",
  description,
  className,
}: LanguageSelectorProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [tempSelectedLanguage, setTempSelectedLanguage] = useState<NLLB200Language | null>(null);

  // All languages - Indian + World
  const languages = useMemo(() => {
    return [...INDIAN_NLLB200_LANGUAGES, ...NON_INDIAN_NLLB200_LANGUAGES];
  }, []);

  // Filter languages based on search
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return languages;
    const query = searchQuery.toLowerCase();
    return languages.filter(
      lang => 
        lang.name.toLowerCase().includes(query) ||
        lang.script.toLowerCase().includes(query)
    );
  }, [languages, searchQuery]);

  // Group languages
  const indianLanguages = useMemo(() => 
    filteredLanguages.filter(l => l.isIndian), 
    [filteredLanguages]
  );
  
  const worldLanguages = useMemo(() => 
    filteredLanguages.filter(l => !l.isIndian), 
    [filteredLanguages]
  );

  const handleOpenChange = () => {
    setIsOpen(true);
    setSearchQuery("");
    // Set temp selection to current language
    const currentLang = languages.find(l => l.name === selectedLanguage);
    setTempSelectedLanguage(currentLang || null);
  };

  const handleSelectLanguage = (lang: NLLB200Language) => {
    setTempSelectedLanguage(lang);
  };

  const handleSaveLanguage = async () => {
    if (!tempSelectedLanguage) return;
    
    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please log in to change language",
          variant: "destructive",
        });
        return;
      }

      // Update profile preferred language
      await supabase
        .from("profiles")
        .update({ 
          preferred_language: tempSelectedLanguage.name,
          primary_language: tempSelectedLanguage.name 
        })
        .eq("user_id", user.id);

      // Update or insert user_languages
      const { data: existingLang } = await supabase
        .from("user_languages")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existingLang) {
        await supabase
          .from("user_languages")
          .update({
            language_name: tempSelectedLanguage.name,
            language_code: tempSelectedLanguage.code
          })
          .eq("id", existingLang.id);
      } else {
        await supabase
          .from("user_languages")
          .insert({
            user_id: user.id,
            language_name: tempSelectedLanguage.name,
            language_code: tempSelectedLanguage.code
          });
      }

      onLanguageChange(tempSelectedLanguage.name, tempSelectedLanguage.code);
      setIsOpen(false);
      
      toast({
        title: "Language Saved",
        description: `Your language is now set to ${tempSelectedLanguage.name}`,
      });
    } catch (error) {
      console.error("Error updating language:", error);
      toast({
        title: "Error",
        description: "Failed to save language",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setTempSelectedLanguage(null);
    setSearchQuery("");
  };

  const LanguageItem = ({ lang }: { lang: NLLB200Language }) => {
    const isSelected = tempSelectedLanguage?.code === lang.code;
    const isCurrent = selectedLanguage === lang.name;
    
    return (
      <button
        onClick={() => handleSelectLanguage(lang)}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
          isSelected 
            ? "bg-primary/20 border-2 border-primary shadow-sm" 
            : isCurrent
              ? "bg-accent/50 border border-border"
              : "hover:bg-accent border border-transparent"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
            lang.isIndian 
              ? "bg-gradient-to-br from-orange-500 to-green-500 text-white" 
              : "bg-gradient-to-br from-blue-500 to-purple-500 text-white"
          )}>
            {lang.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{lang.name}</p>
            <p className="text-xs text-muted-foreground">{lang.script}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCurrent && !isSelected && (
            <Badge variant="secondary" className="text-xs">Current</Badge>
          )}
          {isSelected && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      
      {/* Current Language Display with Change Button */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-background/80 border border-border/50">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
            ALL_NLLB200_LANGUAGES.find(l => l.name === selectedLanguage)?.isIndian
              ? "bg-gradient-to-br from-orange-500 to-green-500 text-white"
              : "bg-gradient-to-br from-blue-500 to-purple-500 text-white"
          )}>
            {selectedLanguage?.charAt(0) || "?"}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{selectedLanguage || "Select Language"}</p>
            <p className="text-xs text-muted-foreground">
              {ALL_NLLB200_LANGUAGES.find(l => l.name === selectedLanguage)?.script || "Choose your language"}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {ALL_NLLB200_LANGUAGES.find(l => l.name === selectedLanguage)?.isIndian ? "🇮🇳 India" : "🌍 World"}
          </Badge>
        </div>
        
        <Button
          variant="outline"
          onClick={handleOpenChange}
          className="gap-2 h-auto py-3"
        >
          <Languages className="h-4 w-4" />
          Change
        </Button>
      </div>

      {/* Language Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Languages className="h-5 w-5 text-primary" />
              Select Your Language
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Choose from {getTotalLanguageCount()} languages ({INDIAN_NLLB200_LANGUAGES.length} Indian + {NON_INDIAN_NLLB200_LANGUAGES.length} World)
            </p>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search languages... (e.g., Hindi, Tamil, French)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base bg-background"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-2">
                Found {filteredLanguages.length} language{filteredLanguages.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          {/* Language List */}
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-6">
              {/* Indian Languages Section */}
              {indianLanguages.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-2 mb-3 bg-gradient-to-r from-orange-500/10 to-green-500/10 rounded-lg">
                    <span className="text-xl">🇮🇳</span>
                    <span className="text-sm font-bold text-foreground">
                      Indian Languages
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {indianLanguages.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    {indianLanguages.map((lang) => (
                      <LanguageItem key={lang.code} lang={lang} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* World Languages Section */}
              {worldLanguages.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-2 mb-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg">
                    <Globe className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-bold text-foreground">
                      World Languages
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {worldLanguages.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    {worldLanguages.map((lang) => (
                      <LanguageItem key={lang.code} lang={lang} />
                    ))}
                  </div>
                </div>
              )}
              
              {filteredLanguages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Languages className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No languages found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer with Cancel and Save */}
          <DialogFooter className="p-6 pt-4 border-t border-border/50 bg-muted/30">
            <div className="flex items-center justify-between w-full gap-3">
              <div className="text-sm text-muted-foreground">
                {tempSelectedLanguage && tempSelectedLanguage.name !== selectedLanguage && (
                  <span>
                    Selected: <strong className="text-foreground">{tempSelectedLanguage.name}</strong>
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleSaveLanguage}
                  disabled={!tempSelectedLanguage || tempSelectedLanguage.name === selectedLanguage || isUpdating}
                  className="gap-2"
                >
                  {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Language
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LanguageSelector;
