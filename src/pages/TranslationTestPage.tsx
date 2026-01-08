import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Loader2 } from 'lucide-react';
import {
  translateSemanticUniversal,
  processUniversalChatMessage,
  autoDetectLanguage,
  LANGUAGES,
  type LanguageInfo,
} from '@/lib/translation';

interface TestResult {
  sourceLanguage: string;
  targetLanguage: string;
  input: string;
  output: string;
  detected: string;
  wasTranslated: boolean;
  wasTransliterated: boolean;
  success: boolean;
}

const TEST_PHRASES = [
  { text: 'hello', expectedCategory: 'greeting' },
  { text: 'thank you', expectedCategory: 'thanks' },
  { text: 'goodbye', expectedCategory: 'farewell' },
  { text: 'how are you', expectedCategory: 'wellbeing_query' },
  { text: 'yes', expectedCategory: 'affirmation' },
  { text: 'no', expectedCategory: 'negation' },
  { text: 'sorry', expectedCategory: 'apology' },
  { text: 'love', expectedCategory: 'love' },
  { text: 'namaste', expectedCategory: 'greeting' },
  { text: 'gracias', expectedCategory: 'thanks' },
  { text: 'bonjour', expectedCategory: 'greeting' },
  { text: 'danke', expectedCategory: 'thanks' },
  { text: 'hola', expectedCategory: 'greeting' },
  { text: 'arigatou', expectedCategory: 'thanks' },
  { text: 'shukriya', expectedCategory: 'thanks' },
];

// Use LANGUAGES directly as array of LanguageInfo
const languages: LanguageInfo[] = LANGUAGES;

export default function TranslationTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [customText, setCustomText] = useState('hello');
  const [sourceLanguage, setSourceLanguage] = useState('english');
  const [targetLanguage, setTargetLanguage] = useState('hindi');
  const [customResult, setCustomResult] = useState<TestResult | null>(null);

  const totalLanguages = languages.length;

  // Run quick test for greeting across all 65 languages
  const runAllLanguageTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    const results: TestResult[] = [];
    const testPhrase = 'hello';
    const total = languages.length;

    for (let i = 0; i < languages.length; i++) {
      const lang = languages[i];
      
      try {
        const result = translateSemanticUniversal(testPhrase, lang.name, 'english');
        
        results.push({
          sourceLanguage: 'english',
          targetLanguage: lang.name,
          input: testPhrase,
          output: result.translatedText,
          detected: result.detectedLanguage,
          wasTranslated: result.wasTranslated,
          wasTransliterated: result.wasTransliterated,
          success: result.translatedText !== testPhrase || lang.name === 'english',
        });
      } catch (error) {
        results.push({
          sourceLanguage: 'english',
          targetLanguage: lang.name,
          input: testPhrase,
          output: 'ERROR',
          detected: 'unknown',
          wasTranslated: false,
          wasTransliterated: false,
          success: false,
        });
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      setTestResults([...results]);
      
      // Small delay to show progress
      await new Promise(r => setTimeout(r, 10));
    }

    setIsRunning(false);
  };

  // Test custom phrase
  const testCustomPhrase = () => {
    const detected = autoDetectLanguage(customText);
    const result = translateSemanticUniversal(customText, targetLanguage, sourceLanguage);
    
    setCustomResult({
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      input: customText,
      output: result.translatedText,
      detected: detected.language,
      wasTranslated: result.wasTranslated,
      wasTransliterated: result.wasTransliterated,
      success: result.wasTranslated || result.wasTransliterated,
    });
  };

  // Test bidirectional chat
  const testBidirectionalChat = () => {
    const chatResult = processUniversalChatMessage(customText, sourceLanguage, targetLanguage);
    
    setCustomResult({
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      input: customText,
      output: `Sender: ${chatResult.senderView} | Receiver: ${chatResult.receiverView}`,
      detected: sourceLanguage,
      wasTranslated: chatResult.wasTranslated,
      wasTransliterated: chatResult.wasTransliterated,
      success: chatResult.wasTranslated || chatResult.wasTransliterated,
    });
  };

  const successCount = testResults.filter(r => r.success).length;
  const translatedCount = testResults.filter(r => r.wasTranslated).length;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🌍 Universal Translation Test - 65 Languages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Tests semantic translation across all 65 supported languages using embedded phonetic patterns.
            No external APIs, no NLLB-200 model.
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAllLanguageTest} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing... {progress}%
                </>
              ) : (
                'Test "hello" → All 65 Languages'
              )}
            </Button>
          </div>

          {/* Progress & Stats */}
          {testResults.length > 0 && (
            <div className="flex gap-4 flex-wrap">
              <Badge variant="outline">
                Total: {testResults.length}/{languages.length}
              </Badge>
              <Badge variant="default" className="bg-green-500">
                Translated: {translatedCount}
              </Badge>
              <Badge variant="secondary">
                Changed: {successCount}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Test */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Translation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Enter text..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.name}>
                    {lang.native} ({lang.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.name}>
                    {lang.native} ({lang.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={testCustomPhrase} size="sm">
                Translate
              </Button>
              <Button onClick={testBidirectionalChat} variant="outline" size="sm">
                Chat Mode
              </Button>
            </div>
          </div>

          {customResult && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Input:</strong> {customResult.input}</div>
                  <div><strong>Detected:</strong> {customResult.detected}</div>
                  <div className="col-span-2"><strong>Output:</strong> {customResult.output}</div>
                  <div>
                    <strong>Translated:</strong>{' '}
                    {customResult.wasTranslated ? (
                      <Check className="inline h-4 w-4 text-green-500" />
                    ) : (
                      <X className="inline h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <strong>Transliterated:</strong>{' '}
                    {customResult.wasTransliterated ? (
                      <Check className="inline h-4 w-4 text-green-500" />
                    ) : (
                      <X className="inline h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Test Results Grid */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results: "hello" → 65 Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border text-sm ${
                      result.wasTranslated
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : result.success
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        : 'bg-muted border-border'
                    }`}
                  >
                    <div className="font-medium capitalize">
                      {result.targetLanguage}
                      {result.wasTranslated && (
                        <Badge className="ml-2 bg-green-500 text-xs">Translated</Badge>
                      )}
                    </div>
                    <div className="text-lg">{result.output}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Sample Phrases Quick Test */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Phrases (English → Hindi)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {TEST_PHRASES.map((phrase, idx) => {
              const result = translateSemanticUniversal(phrase.text, 'hindi', 'english');
              return (
                <div key={idx} className="p-2 rounded border bg-muted/50">
                  <div className="text-sm text-muted-foreground">{phrase.text}</div>
                  <div className="font-medium">{result.translatedText}</div>
                  {result.wasTranslated && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {phrase.expectedCategory}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
