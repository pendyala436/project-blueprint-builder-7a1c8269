import React from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

interface I18nLanguageSelectorProps {
  variant?: 'default' | 'compact' | 'full';
  className?: string;
}

export const I18nLanguageSelector: React.FC<I18nLanguageSelectorProps> = ({
  variant = 'default',
  className,
}) => {
  const { currentLocale, currentLocaleInfo, changeLanguage, isChangingLanguage, getLocales } = useI18n();
  const locales = getLocales();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === 'compact' ? 'sm' : 'default'}
          className={cn('gap-2', className)}
          disabled={isChangingLanguage}
        >
          <Globe className="h-4 w-4" />
          {variant !== 'compact' && (
            <span className="hidden sm:inline">
              {currentLocaleInfo.nativeName}
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => changeLanguage(locale.code)}
            className="flex items-center justify-between gap-4 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{locale.nativeName}</span>
              {variant === 'full' && (
                <span className="text-muted-foreground text-sm">
                  ({locale.name})
                </span>
              )}
            </span>
            {currentLocale === locale.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default I18nLanguageSelector;
