import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Languages, Search, Check, Globe, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  INDIAN_NLLB200_LANGUAGES, 
  NON_INDIAN_NLLB200_LANGUAGES,
  NLLB200Language,
  getTotalLanguageCount
} from "@/data/nllb200Languages";
import useTranslation from "@/hooks/useTranslation";

export const LoginLanguageSelector = () => {
  const { currentLanguageName, setLanguage, isChangingLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSelectLanguage = async (lang: NLLB200Language) => {
    setIsOpen(false);
    setSearchQuery("");
    await setLanguage(lang.name);
  };

  const LanguageItem = ({ lang }: { lang: NLLB200Language }) => {
    const isSelected = currentLanguageName === lang.name;
    
    return (
      <button
        onClick={() => handleSelectLanguage(lang)}
        disabled={isChangingLanguage}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
          isSelected 
            ? "bg-primary/20 border-2 border-primary shadow-sm" 
            : "hover:bg-accent border border-transparent",
          isChangingLanguage && "opacity-50 cursor-not-allowed"
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
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Compact Language Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={isChangingLanguage}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        {isChangingLanguage ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">{t('common.loading', 'Loading...')}</span>
          </>
        ) : (
          <>
            <Languages className="h-4 w-4" />
            <span className="font-medium">{currentLanguageName}</span>
          </>
        )}
      </Button>

      {/* Language Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Languages className="h-5 w-5 text-primary" />
              {t('settings.selectLanguage', 'Select Language')}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('common.language', 'Choose from')} {getTotalLanguageCount()} {t('navigation.messages', 'languages')}
            </p>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('common.search', 'Search languages...')}
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
          </div>
          
          {/* Loading indicator */}
          {isChangingLanguage && (
            <div className="px-6 py-3 bg-primary/10 border-b border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">{t('common.loading', 'Translating...')}</span>
              </div>
            </div>
          )}
          
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
                  <p className="font-medium">{t('matches.noMatches', 'No languages found')}</p>
                  <p className="text-sm mt-1">{t('errors.tryAgain', 'Try a different search term')}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoginLanguageSelector;
