import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, Globe, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

interface AuthLanguageSelectorProps {
  className?: string;
}

export const AuthLanguageSelector: React.FC<AuthLanguageSelectorProps> = ({
  className,
}) => {
  const { currentLocale, currentLocaleInfo, changeLanguage, isChangingLanguage, getLocales } = useI18n();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const locales = getLocales();
  
  // Filter locales based on search query
  const filteredLocales = useMemo(() => {
    if (!searchQuery.trim()) return locales;
    
    const query = searchQuery.toLowerCase();
    return locales.filter(locale => 
      locale.name.toLowerCase().includes(query) ||
      locale.nativeName.toLowerCase().includes(query) ||
      locale.code.toLowerCase().includes(query)
    );
  }, [locales, searchQuery]);

  const handleSelect = async (localeCode: string) => {
    await changeLanguage(localeCode as any);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full h-12 justify-between rounded-xl border-2 border-input hover:border-primary/50 transition-all',
            className
          )}
          disabled={isChangingLanguage}
        >
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <span className="flex items-center gap-2">
              <span className="font-medium">{currentLocaleInfo.nativeName}</span>
              <span className="text-muted-foreground text-sm">({currentLocaleInfo.name})</span>
            </span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {filteredLocales.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No language found.
              </div>
            ) : (
              filteredLocales.map((locale) => (
                <button
                  key={locale.code}
                  onClick={() => handleSelect(locale.code)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    currentLocale === locale.code && 'bg-primary/10'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{locale.nativeName}</span>
                    <span className="text-xs text-muted-foreground">{locale.name}</span>
                  </div>
                  {currentLocale === locale.code && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default AuthLanguageSelector;
