/**
 * Translation Test Panel
 * ======================
 * Tests all 6 translation path combinations using "Where is your home?":
 * 1. Native → Native (Hindi → Tamil)
 * 2. Latin → Native (English → Hindi)
 * 3. Native → Latin (Hindi → English)
 * 4. Latin → Latin (English → Spanish)
 * 5. English → Latin (English → French)
 * 6. English → Native (English → Bengali)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Check, X, ArrowRight, Globe, Languages } from 'lucide-react';
import { 
  translateText, 
  getLanguageCount, 
  isReady,
  isLatinScriptLanguage,
  getLanguageInfo,
  type TranslationResult
} from '@/lib/translation/translate';

const TEST_TEXT = "Where is your home?";

interface TestCase {
  id: string;
  name: string;
  description: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  sourceScript: 'Latin' | 'Native';
  targetScript: 'Latin' | 'Native';
  expectedBehavior: string;
}

interface TestResultData {
  id: string;
  output: string;
  pivot?: string;
  confidence: number;
  success: boolean;
  isSameLanguage: boolean;
  isTranslated: boolean;
  error?: string;
  duration: number;
}

const TEST_CASES: TestCase[] = [
  // 1. Native → Native (Hindi → Tamil) - Requires English pivot
  {
    id: 'native-to-native',
    name: 'Native → Native',
    description: 'Hindi to Tamil (via English pivot)',
    sourceLanguage: 'hindi',
    targetLanguage: 'tamil',
    sourceText: 'आपका घर कहाँ है?', // "Where is your home?" in Hindi
    sourceScript: 'Native',
    targetScript: 'Native',
    expectedBehavior: 'Semantic: Hindi → English → Tamil (English pivot)',
  },
  // 2. Latin → Native (English → Hindi) - Direct, no pivot
  {
    id: 'latin-to-native',
    name: 'English → Native',
    description: 'English to Hindi (direct semantic translation)',
    sourceLanguage: 'english',
    targetLanguage: 'hindi',
    sourceText: TEST_TEXT,
    sourceScript: 'Latin',
    targetScript: 'Native',
    expectedBehavior: 'Direct semantic translation (no pivot needed)',
  },
  // 3. Native → Latin (Hindi → English) - Direct, no pivot
  {
    id: 'native-to-latin',
    name: 'Native → English',
    description: 'Hindi to English (direct semantic translation)',
    sourceLanguage: 'hindi',
    targetLanguage: 'english',
    sourceText: 'आपका घर कहाँ है?',
    sourceScript: 'Native',
    targetScript: 'Latin',
    expectedBehavior: 'Direct semantic translation (no pivot needed)',
  },
  // 4. Latin → Latin (English → Spanish) - Direct, no pivot
  {
    id: 'latin-to-latin',
    name: 'Latin → Latin',
    description: 'English to Spanish (direct semantic translation)',
    sourceLanguage: 'english',
    targetLanguage: 'spanish',
    sourceText: TEST_TEXT,
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct semantic translation (no pivot needed)',
  },
  // 5. English → French (Latin → Latin) - Direct, no pivot  
  {
    id: 'english-to-french',
    name: 'English → French',
    description: 'English to French (direct semantic translation)',
    sourceLanguage: 'english',
    targetLanguage: 'french',
    sourceText: TEST_TEXT,
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct semantic translation (no pivot needed)',
  },
  // 6. English → Bengali - Direct, no pivot
  {
    id: 'english-to-bengali',
    name: 'English → Bengali',
    description: 'English to Bengali (direct semantic translation)',
    sourceLanguage: 'english',
    targetLanguage: 'bengali',
    sourceText: TEST_TEXT,
    sourceScript: 'Latin',
    targetScript: 'Native',
    expectedBehavior: 'Direct semantic translation (no pivot needed)',
  },
  // 7. English → Arabic - Direct, no pivot
  {
    id: 'english-to-arabic',
    name: 'English → Arabic',
    description: 'English to Arabic RTL (direct semantic translation)',
    sourceLanguage: 'english',
    targetLanguage: 'arabic',
    sourceText: TEST_TEXT,
    sourceScript: 'Latin',
    targetScript: 'Native',
    expectedBehavior: 'Direct semantic translation (no pivot needed)',
  },
  // 8. Spanish → French (Latin → Latin) - Direct, no pivot
  {
    id: 'spanish-to-french',
    name: 'Spanish → French',
    description: 'Spanish to French (direct Latin-to-Latin)',
    sourceLanguage: 'spanish',
    targetLanguage: 'french',
    sourceText: '¿Dónde está tu casa?', // Where is your home in Spanish
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct semantic translation (no English pivot)',
  },
  // 9. Same Language Test
  {
    id: 'same-language-test',
    name: 'Same Language',
    description: 'Hindi to Hindi (returns input unchanged)',
    sourceLanguage: 'hindi',
    targetLanguage: 'hindi',
    sourceText: 'आपका घर कहाँ है?',
    sourceScript: 'Native',
    targetScript: 'Native',
    expectedBehavior: 'Returns input as-is (no translation)',
  },
];

export default function TranslationTestPanel() {
  const [results, setResults] = useState<Record<string, TestResultData>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [languageCount, setLanguageCount] = useState(0);
  const [systemReady, setSystemReady] = useState(false);

  useEffect(() => {
    setSystemReady(isReady());
    setLanguageCount(getLanguageCount());
  }, []);

  const runTest = async (testCase: TestCase) => {
    setRunning(testCase.id);
    const startTime = performance.now();

    try {
      const result: TranslationResult = await translateText(
        testCase.sourceText,
        testCase.sourceLanguage,
        testCase.targetLanguage
      );

      const duration = performance.now() - startTime;

      setResults(prev => ({
        ...prev,
        [testCase.id]: {
          id: testCase.id,
          output: result.text,
          pivot: result.englishPivot,
          confidence: result.confidence,
          success: true,
          isSameLanguage: result.isSameLanguage,
          isTranslated: result.isTranslated,
          duration,
        },
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testCase.id]: {
          id: testCase.id,
          output: '',
          confidence: 0,
          success: false,
          isSameLanguage: false,
          isTranslated: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: performance.now() - startTime,
        },
      }));
    }

    setRunning(null);
  };

  const runAllTests = async () => {
    for (const testCase of TEST_CASES) {
      await runTest(testCase);
      // Small delay between tests
      await new Promise(r => setTimeout(r, 100));
    }
  };

  const getScriptBadge = (lang: string) => {
    const info = getLanguageInfo(lang);
    const isLatin = isLatinScriptLanguage(lang);
    return (
      <Badge variant={isLatin ? "secondary" : "default"} className="text-xs">
        {info?.script || (isLatin ? 'Latin' : 'Native')}
      </Badge>
    );
  };

  const successCount = Object.values(results).filter(r => r.success).length;
  const totalRun = Object.keys(results).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary" />
                Translation Test Panel
              </CardTitle>
              <CardDescription className="mt-1">
                Testing "{TEST_TEXT}" across 6 language/script combinations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {languageCount} languages
              </Badge>
              <Badge variant={systemReady ? "default" : "destructive"}>
                {systemReady ? 'Ready' : 'Not Ready'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={runAllTests} disabled={running !== null || !systemReady}>
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>
            {totalRun > 0 && (
              <span className="text-sm text-muted-foreground">
                {successCount}/{totalRun} passed
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {TEST_CASES.map((testCase) => {
          const result = results[testCase.id];
          const isRunning = running === testCase.id;

          return (
            <Card 
              key={testCase.id} 
              className={`transition-colors ${
                result?.success ? 'border-green-500/50 bg-green-500/5' : 
                result?.error ? 'border-red-500/50 bg-red-500/5' : 
                isRunning ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant={testCase.sourceScript === 'Latin' ? 'secondary' : 'default'}>
                      {testCase.sourceScript}
                    </Badge>
                    <ArrowRight className="w-4 h-4" />
                    <Badge variant={testCase.targetScript === 'Latin' ? 'secondary' : 'default'}>
                      {testCase.targetScript}
                    </Badge>
                    <span className="ml-2">{testCase.name}</span>
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runTest(testCase)}
                    disabled={isRunning}
                  >
                    {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{testCase.description}</p>
                
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">From:</span>
                    <span className="font-mono bg-muted px-2 py-0.5 rounded capitalize">
                      {testCase.sourceLanguage}
                    </span>
                    {getScriptBadge(testCase.sourceLanguage)}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">To:</span>
                    <span className="font-mono bg-muted px-2 py-0.5 rounded capitalize">
                      {testCase.targetLanguage}
                    </span>
                    {getScriptBadge(testCase.targetLanguage)}
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Input:</div>
                  <div className="text-foreground font-medium">{testCase.sourceText}</div>
                </div>

                <div className="text-xs text-muted-foreground italic">
                  Expected: {testCase.expectedBehavior}
                </div>

                {result && (
                  <div className={`p-3 rounded-md border ${
                    result.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {result.success ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({result.duration.toFixed(1)}ms)
                      </span>
                      {result.isSameLanguage && (
                        <Badge variant="outline" className="text-xs">Same Language</Badge>
                      )}
                      {result.isTranslated && (
                        <Badge variant="outline" className="text-xs">Translated</Badge>
                      )}
                    </div>

                    <div className="bg-primary/10 p-2 rounded">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
                      <div className="text-foreground font-medium text-lg">
                        {result.output || '(empty)'}
                      </div>
                    </div>

                    {result.pivot && (
                      <div className="mt-2 p-2 bg-blue-500/10 rounded">
                        <div className="text-xs font-medium text-blue-600">English Pivot:</div>
                        <div className="text-sm">{result.pivot}</div>
                      </div>
                    )}

                    {result.error && (
                      <div className="text-sm text-red-500 mt-2">
                        Error: {result.error}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mt-2">
                      Confidence: {(result.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Language Stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-primary">{languageCount}</div>
              <div className="text-sm text-muted-foreground">Total Languages</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-green-500">{successCount}</div>
              <div className="text-sm text-muted-foreground">Tests Passed</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{TEST_CASES.length}</div>
              <div className="text-sm text-muted-foreground">Test Cases</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios Explained</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Badge variant="default" className="mt-0.5">Native → Native</Badge>
              <span>Hindi to Tamil - Uses English pivot (Hindi → English → Tamil)</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">Latin → Native</Badge>
              <span>English to Hindi - Transliterates to Devanagari script</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="default" className="mt-0.5">Native → Latin</Badge>
              <span>Hindi to English - Reverse transliterates to Latin</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">Latin → Latin</Badge>
              <span>English to Spanish - Stays in Latin script</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Same Language</Badge>
              <span>Returns input unchanged (no translation needed)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}