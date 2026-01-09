/**
 * Universal Semantic Translator Component
 * ========================================
 * 
 * Language-count independent UI that:
 * - Dynamically discovers available languages
 * - Works for 10, 100, or 386+ languages automatically
 * - Uses semantic (meaning-based) translation
 * - English pivot for cross-language pairs
 */

import React, { useEffect, useState, useCallback } from 'react';
import { loadEngine, type Language } from '@/lib/translation/engine';
import { semanticTranslate, type SemanticTranslationResult } from '@/lib/translation/semantic-translate';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, Languages, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SemanticTranslatorProps {
  defaultSourceLanguage?: string;
  defaultTargetLanguage?: string;
  className?: string;
  showLanguageCount?: boolean;
}

export function SemanticTranslator({
  defaultSourceLanguage = 'en',
  defaultTargetLanguage = 'hi',
  className,
  showLanguageCount = true,
}: SemanticTranslatorProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SemanticTranslationResult | null>(null);

  // Load languages dynamically from engine
  useEffect(() => {
    const initEngine = async () => {
      try {
        setIsLoading(true);
        const engine = await loadEngine();
        const langs = engine.getLanguages();
        setLanguages(langs);
        
        // Set default languages if they exist
        const srcExists = langs.some(l => l.code === defaultSourceLanguage);
        const tgtExists = langs.some(l => l.code === defaultTargetLanguage);
        
        if (!srcExists && langs.length > 0) {
          setSourceLanguage(langs[0].code);
        }
        if (!tgtExists && langs.length > 1) {
          setTargetLanguage(langs[1].code);
        }
      } catch (err) {
        console.error('[SemanticTranslator] Failed to load engine:', err);
        setError('Failed to load translation engine');
      } finally {
        setIsLoading(false);
      }
    };

    initEngine();
  }, [defaultSourceLanguage, defaultTargetLanguage]);

  // Handle translation
  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      setOutputText('');
      setLastResult(null);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await semanticTranslate(inputText, sourceLanguage, targetLanguage);
      setOutputText(result.text);
      setLastResult(result);
      
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('[SemanticTranslator] Translation failed:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      setOutputText('');
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, sourceLanguage, targetLanguage]);

  // Swap languages
  const handleSwapLanguages = useCallback(() => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setInputText(outputText);
    setOutputText(inputText);
  }, [sourceLanguage, targetLanguage, inputText, outputText]);

  // Get display name for a language
  const getLanguageDisplay = (lang: Language) => {
    return lang.nativeName !== lang.name 
      ? `${lang.nativeName} (${lang.name})`
      : lang.name;
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading translation engine...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          Semantic Translator
          {showLanguageCount && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {languages.length} languages
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Language Selection */}
        <div className="flex items-center gap-2">
          <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Source language" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {languages.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {getLanguageDisplay(lang)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwapLanguages}
            title="Swap languages"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Target language" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {languages.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {getLanguageDisplay(lang)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <Textarea
            placeholder="Enter text to translate..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-24 resize-none"
          />
        </div>

        {/* Translate Button */}
        <Button
          onClick={handleTranslate}
          disabled={!inputText.trim() || isTranslating}
          className="w-full"
        >
          {isTranslating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Translate
            </>
          )}
        </Button>

        {/* Output Area */}
        {outputText && (
          <div className="space-y-2">
            <Textarea
              value={outputText}
              readOnly
              className="min-h-24 resize-none bg-muted/50"
            />
            
            {/* Translation Info */}
            {lastResult && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {lastResult.sourceLanguage} → {lastResult.targetLanguage}
                </span>
                {lastResult.englishPivot && (
                  <span className="text-primary/70">
                    via English pivot
                  </span>
                )}
                <span>
                  Confidence: {Math.round(lastResult.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SemanticTranslator;
