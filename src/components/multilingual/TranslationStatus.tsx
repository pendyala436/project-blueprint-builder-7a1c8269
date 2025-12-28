/**
 * Translation Status Component
 * Shows the current translation status and settings
 */

import { Badge } from '@/components/ui/badge';
import { 
  Languages, 
  Check, 
  ArrowRight, 
  Globe, 
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNativeName, isSameLanguage } from '@/lib/dl-translate/languages';

interface TranslationStatusProps {
  sourceLanguage: string;
  targetLanguage: string;
  isTranslating?: boolean;
  translationEnabled?: boolean;
  className?: string;
}

export function TranslationStatus({
  sourceLanguage,
  targetLanguage,
  isTranslating = false,
  translationEnabled = true,
  className,
}: TranslationStatusProps) {
  const sameLanguage = isSameLanguage(sourceLanguage, targetLanguage);
  const sourceNative = getNativeName(sourceLanguage);
  const targetNative = getNativeName(targetLanguage);

  if (sameLanguage) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20",
        className
      )}>
        <Check className="h-4 w-4 text-green-500" />
        <span className="text-sm text-green-600 dark:text-green-400">
          Same language - no translation needed
        </span>
        <Badge variant="outline" className="text-xs border-green-500/30">
          {sourceNative}
        </Badge>
      </div>
    );
  }

  if (!translationEnabled) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20",
        className
      )}>
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <span className="text-sm text-yellow-600 dark:text-yellow-400">
          Translation disabled
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20",
      className
    )}>
      <Languages className={cn(
        "h-4 w-4",
        isTranslating ? "text-primary animate-pulse" : "text-primary"
      )} />
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3 text-muted-foreground" />
          <Badge variant="secondary" className="text-xs">
            {sourceNative}
          </Badge>
        </div>

        <ArrowRight className="h-3 w-3 text-muted-foreground" />

        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            {targetNative}
          </Badge>
          <Globe className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {isTranslating ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />
      ) : (
        <Check className="h-4 w-4 text-primary ml-auto" />
      )}
    </div>
  );
}
