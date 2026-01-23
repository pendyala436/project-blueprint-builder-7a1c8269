/**
 * Offline Universal Translator Component
 * =======================================
 * 
 * Browser-based translation UI supporting 1000+ languages
 * Uses Supabase-stored dictionaries + dynamic transliteration
 * 
 * NO EXTERNAL APIS - 100% OFFLINE CAPABLE
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRightLeft, Loader2, Globe, Languages, Wifi, WifiOff } from 'lucide-react';
import {
  useOfflineTranslation,
  type LivePreviewResult,
} from '@/hooks/useOfflineTranslation';

interface OfflineTranslatorProps {
  defaultSource?: string;
  defaultTarget?: string;
  showLanguageCount?: boolean;
  compact?: boolean;
  onTranslate?: (result: { text: string; method: string }) => void;
}

export default function OfflineTranslator({
  defaultSource = 'english',
  defaultTarget = 'hindi',
  showLanguageCount = true,
  compact = false,
  onTranslate,
}: OfflineTranslatorProps) {
  const {
    isReady,
    isLoading,
    error: initError,
    translate,
    getLivePreview,
    getLanguages,
    getLanguageCount,
    isLatinScriptLanguage,
  } = useOfflineTranslation({ autoInitialize: true });

  const [source, setSource] = useState(defaultSource);
  const [target, setTarget] = useState(defaultTarget);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [preview, setPreview] = useState<LivePreviewResult | null>(null);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const languages = getLanguages();
  const languageCount = getLanguageCount();

  // Live preview on input change
  useEffect(() => {
    if (!input.trim()) {
      setPreview(null);
      return;
    }

    const result = getLivePreview(input, source);
    setPreview(result);
  }, [input, source, getLivePreview]);

  // Translate handler
  const handleTranslate = useCallback(async () => {
    if (!input.trim() || !source || !target) return;

    setTranslating(true);
    setError(null);

    try {
      const result = await translate(input, source, target);
      setOutput(result.text);
      setMethod(result.method);
      setConfidence(result.confidence);
      onTranslate?.({ text: result.text, method: result.method });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      setOutput('');
    } finally {
      setTranslating(false);
    }
  }, [input, source, target, translate, onTranslate]);

  // Swap languages
  const handleSwap = useCallback(() => {
    setSource(target);
    setTarget(source);
    setInput(output);
    setOutput(input);
  }, [source, target, input, output]);

  // Filter languages
  const filteredLanguages = languages.filter(
    (l) =>
      !searchQuery ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get script badge
  const getScriptBadge = (lang: string) => {
    const isLatin = isLatinScriptLanguage(lang);
    return (
      <Badge variant={isLatin ? 'secondary' : 'default'} className="text-xs">
        {isLatin ? 'Latin' : 'Native'}
      </Badge>
    );
  };

  if (compact) {
    return (
      <div className="space-y-4 p-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isReady ? (
            <>
              <WifiOff className="h-4 w-4 text-green-500" />
              <span>Offline Ready</span>
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 text-yellow-500" />
              <span>Initializing...</span>
            </>
          )}
        </div>

        {/* Language selectors */}
        <div className="flex items-center gap-2">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {filteredLanguages.slice(0, 100).map((l) => (
                <SelectItem key={l.code} value={l.name}>
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
                <SelectItem key={l.code} value={l.name}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input */}
        <Textarea
          placeholder="Enter text to translate..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
        />

        {/* Live preview */}
        {preview?.isTransliterated && (
          <div className="p-2 bg-primary/10 rounded text-sm">
            <span className="text-muted-foreground">Preview: </span>
            {preview.preview}
          </div>
        )}

        {/* Translate button */}
        <Button
          onClick={handleTranslate}
          disabled={translating || !input.trim() || !isReady}
          className="w-full"
        >
          {translating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            'Translate (Offline)'
          )}
        </Button>

        {/* Output */}
        {output && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">{output}</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline">{method}</Badge>
              <Badge variant="secondary">{Math.round(confidence * 100)}%</Badge>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
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
          Offline Universal Translator
          {showLanguageCount && (
            <span className="text-sm font-normal text-muted-foreground">
              ({languageCount} languages)
            </span>
          )}
          {isReady ? (
            <Badge variant="outline" className="ml-auto text-green-600">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Loading...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {initError && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            Initialization error: {initError}
          </div>
        )}

        {/* Language Selection */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">
              Source Language {getScriptBadge(source)}
            </label>
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
                  <SelectItem key={l.code} value={l.name}>
                    <span className="flex items-center gap-2">
                      <span>{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.nativeName}</span>
                    </span>
                  </SelectItem>
                ))}
                {filteredLanguages.length > 100 && (
                  <div className="p-2 text-xs text-center text-muted-foreground">
                    Type to search {languageCount} languages
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="icon" onClick={handleSwap} className="mt-6">
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">
              Target Language {getScriptBadge(target)}
            </label>
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
                  <SelectItem key={l.code} value={l.name}>
                    <span className="flex items-center gap-2">
                      <span>{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.nativeName}</span>
                    </span>
                  </SelectItem>
                ))}
                {filteredLanguages.length > 100 && (
                  <div className="p-2 text-xs text-center text-muted-foreground">
                    Type to search {languageCount} languages
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Input */}
        <div>
          <label className="text-sm font-medium mb-1 block">Text to Translate</label>
          <Textarea
            placeholder="Enter text here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Live Preview */}
        {preview?.isTransliterated && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <label className="text-xs text-muted-foreground block mb-1">
              Live Transliteration Preview
            </label>
            <p className="text-lg">{preview.preview}</p>
          </div>
        )}

        {/* Translate Button */}
        <Button
          onClick={handleTranslate}
          disabled={translating || !source || !target || !input.trim() || !isReady}
          className="w-full"
          size="lg"
        >
          {translating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <Languages className="mr-2 h-4 w-4" />
              Translate (100% Offline)
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
              <p className="whitespace-pre-wrap text-lg">{output}</p>
            </div>

            {/* Translation Details */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                Method: {method}
              </Badge>
              <Badge variant="secondary">
                Confidence: {Math.round(confidence * 100)}%
              </Badge>
              <Badge variant="default" className="bg-green-600">
                <WifiOff className="h-3 w-3 mr-1" />
                No External APIs
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
