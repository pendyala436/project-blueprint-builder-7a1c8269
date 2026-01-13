/**
 * Universal Translator Component - 1000+ Languages
 * =================================================
 * 
 * Browser-based, offline translation UI supporting all languages
 * from men_languages.ts and women_languages.ts.
 * 
 * Features:
 * - Same-language bypass (returns input as-is)
 * - Dynamic language discovery
 * - Real-time translation
 * - Native script preview
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ArrowRightLeft, Loader2, Globe, Languages } from 'lucide-react';
import {
  translateText,
  getLanguages,
  isReady,
  getLanguageCount,
  type Language,
  type TranslationResult,
} from '@/lib/translation/translate';

interface UniversalTranslatorProps {
  defaultSource?: string;
  defaultTarget?: string;
  showLanguageCount?: boolean;
  compact?: boolean;
  /** External input from typing preview (transliteration result) */
  externalInput?: string;
  /** Callback when input changes */
  onInputChange?: (input: string) => void;
}

export default function UniversalTranslator({
  defaultSource = 'en',
  defaultTarget = 'hi',
  showLanguageCount = true,
  compact = false,
  externalInput,
  onInputChange,
}: UniversalTranslatorProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [source, setSource] = useState(defaultSource);
  const [target, setTarget] = useState(defaultTarget);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TranslationResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load languages on mount
  useEffect(() => {
    if (isReady()) {
      setLanguages(getLanguages());
    }
  }, []);

  // Sync external input (from typing transliteration)
  useEffect(() => {
    if (externalInput !== undefined && externalInput !== input) {
      setInput(externalInput);
    }
  }, [externalInput]);

  // Notify parent of input changes
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    onInputChange?.(value);
  }, [onInputChange]);

  // Translate handler
  const handleTranslate = useCallback(async () => {
    if (!input.trim() || !source || !target) return;

    setLoading(true);
    setError(null);

    try {
      const result = await translateText(input, source, target);
      setOutput(result.text);
      setLastResult(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      setOutput('');
      setLastResult(null);
    } finally {
      setLoading(false);
    }
  }, [input, source, target]);

  // Swap languages
  const handleSwap = useCallback(() => {
    setSource(target);
    setTarget(source);
    setInput(output);
    setOutput(input);
    setLastResult(null);
  }, [source, target, input, output]);

  // Filter languages based on search
  const filteredLanguages = languages.filter(
    (l) =>
      !searchQuery ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get language display
  const getLanguageDisplay = (code: string): string => {
    const lang = languages.find((l) => l.code === code);
    return lang ? `${lang.name} (${lang.nativeName})` : code;
  };

  if (compact) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {filteredLanguages.slice(0, 100).map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={handleSwap}>
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {filteredLanguages.slice(0, 100).map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Textarea
          placeholder="Enter text to translate..."
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          rows={3}
        />

        <Button 
          onClick={handleTranslate} 
          disabled={loading || !input.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            'Translate'
          )}
        </Button>

        {output && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">{output}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Universal Translator
          {showLanguageCount && (
            <span className="text-sm font-normal text-muted-foreground">
              ({getLanguageCount()} languages)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language Selection */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Source Language</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select source language" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search languages..."
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {filteredLanguages.slice(0, 100).map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="flex items-center gap-2">
                      <span>{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.nativeName}</span>
                    </span>
                  </SelectItem>
                ))}
                {filteredLanguages.length > 100 && (
                  <div className="p-2 text-xs text-center text-muted-foreground">
                    Type to search {getLanguageCount()} languages
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSwap}
            className="mt-6"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Target Language</label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select target language" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search languages..."
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {filteredLanguages.slice(0, 100).map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="flex items-center gap-2">
                      <span>{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.nativeName}</span>
                    </span>
                  </SelectItem>
                ))}
                {filteredLanguages.length > 100 && (
                  <div className="p-2 text-xs text-center text-muted-foreground">
                    Type to search {getLanguageCount()} languages
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Input */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            Text to Translate
          </label>
          <Textarea
            placeholder="Enter text here..."
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Translate Button */}
        <Button
          onClick={handleTranslate}
          disabled={loading || !source || !target || !input.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <Languages className="mr-2 h-4 w-4" />
              Translate
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Translation</label>
            <div className="p-4 bg-muted rounded-lg min-h-[100px]">
              <p className="whitespace-pre-wrap">{output}</p>
            </div>

            {/* Translation Details */}
            {lastResult && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {lastResult.isSameLanguage && (
                  <span className="px-2 py-1 bg-primary/10 rounded">
                    Same language (no translation needed)
                  </span>
                )}
                {lastResult.isTranslated && (
                  <span className="px-2 py-1 bg-primary/10 rounded">
                    Translated via English pivot
                  </span>
                )}
                {lastResult.englishPivot && (
                  <span className="px-2 py-1 bg-secondary rounded">
                    Pivot: "{lastResult.englishPivot.substring(0, 30)}..."
                  </span>
                )}
                <span className="px-2 py-1 bg-secondary rounded">
                  Confidence: {Math.round(lastResult.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
