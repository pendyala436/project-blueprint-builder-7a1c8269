import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Languages, Search, Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  ALL_NLLB200_LANGUAGES, 
  INDIAN_NLLB200_LANGUAGES, 
  NON_INDIAN_NLLB200_LANGUAGES,
  NLLB200Language 
} from "@/data/nllb200Languages";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LanguageSelectorProps {
  selectedLanguage: string;
  selectedLanguageCode?: string;
  onLanguageChange: (language: string, code: string) => void;
  showAllLanguages?: boolean; // For women to select all NLLB languages
  label?: string;
  description?: string;
  className?: string;
}

export const LanguageSelector = ({
  selectedLanguage,
  selectedLanguageCode,
  onLanguageChange,
  showAllLanguages = false,
  label = "Your Language",
  description,
  className,
}: LanguageSelectorProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Get languages based on user type
  const languages = useMemo(() => {
    if (showAllLanguages) {
      return ALL_NLLB200_LANGUAGES;
    }
    // For men, show Indian languages prominently, then world languages
    return [...INDIAN_NLLB200_LANGUAGES, ...NON_INDIAN_NLLB200_LANGUAGES];
  }, [showAllLanguages]);

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

  const handleSelectLanguage = async (lang: NLLB200Language) => {
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
          preferred_language: lang.name,
          primary_language: lang.name 
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
            language_name: lang.name,
            language_code: lang.code
          })
          .eq("id", existingLang.id);
      } else {
        await supabase
          .from("user_languages")
          .insert({
            user_id: user.id,
            language_name: lang.name,
            language_code: lang.code
          });
      }

      onLanguageChange(lang.name, lang.code);
      setIsOpen(false);
      
      toast({
        title: "Language Updated",
        description: `Your language is now set to ${lang.name}`,
      });
    } catch (error) {
      console.error("Error updating language:", error);
      toast({
        title: "Error",
        description: "Failed to update language",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const LanguageItem = ({ lang }: { lang: NLLB200Language }) => (
    <button
      onClick={() => handleSelectLanguage(lang)}
      disabled={isUpdating}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors text-left",
        selectedLanguage === lang.name && "bg-primary/10 border border-primary/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          lang.isIndian 
            ? "bg-gradient-to-br from-orange-500 to-green-500 text-white" 
            : "bg-gradient-to-br from-blue-500 to-purple-500 text-white"
        )}>
          {lang.name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-foreground">{lang.name}</p>
          <p className="text-xs text-muted-foreground">{lang.script}</p>
        </div>
      </div>
      {selectedLanguage === lang.name && (
        <Check className="h-4 w-4 text-primary" />
      )}
    </button>
  );

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between h-12 bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {selectedLanguage || "Select Language"}
              </span>
              {selectedLanguage && (
                <Badge variant="secondary" className="text-xs">
                  {ALL_NLLB200_LANGUAGES.find(l => l.name === selectedLanguage)?.isIndian ? "🇮🇳" : "🌍"}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search languages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <ScrollArea className="h-80">
            <div className="p-2 space-y-4">
              {/* Indian Languages Section */}
              {indianLanguages.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 mb-2">
                    <span className="text-lg">🇮🇳</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Indian Languages ({indianLanguages.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {indianLanguages.map((lang) => (
                      <LanguageItem key={lang.code} lang={lang} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* World Languages Section */}
              {worldLanguages.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 mb-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      World Languages ({worldLanguages.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {worldLanguages.map((lang) => (
                      <LanguageItem key={lang.code} lang={lang} />
                    ))}
                  </div>
                </div>
              )}
              
              {filteredLanguages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Languages className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No languages found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LanguageSelector;
