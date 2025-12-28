/**
 * Language Selector Component
 * Searchable dropdown for 200+ languages
 */

import { useState, useMemo } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Globe, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGES, searchLanguages, getLanguageInfo } from '@/lib/dl-translate/languages';

interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LanguageSelector({
  value,
  onChange,
  placeholder = 'Select language',
  disabled = false,
  className,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLanguage = getLanguageInfo(value);
  
  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return LANGUAGES.slice(0, 50); // Show first 50 by default
    return searchLanguages(search);
  }, [search]);

  // Group languages by script type
  const groupedLanguages = useMemo(() => {
    const groups: Record<string, typeof LANGUAGES> = {};
    filteredLanguages.forEach(lang => {
      const group = lang.script || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(lang);
    });
    return groups;
  }, [filteredLanguages]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between min-w-[200px]",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {selectedLanguage ? (
              <span className="flex items-center gap-2">
                <span>{selectedLanguage.native}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedLanguage.code.toUpperCase()}
                </Badge>
              </span>
            ) : (
              placeholder
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search languages..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center py-4 text-muted-foreground">
                <Languages className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No language found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            </CommandEmpty>
            
            {Object.entries(groupedLanguages).map(([script, languages]) => (
              <CommandGroup key={script} heading={script}>
                {languages.map((language) => (
                  <CommandItem
                    key={language.code}
                    value={`${language.name} ${language.native} ${language.code}`}
                    onSelect={() => {
                      onChange(language.name);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(language.rtl && "font-arabic")}>
                        {language.native}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        ({language.name})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {language.code.toUpperCase()}
                      </Badge>
                      {value === language.name && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
