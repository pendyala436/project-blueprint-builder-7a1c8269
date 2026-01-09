/**
 * Translation Test Panel
 * ======================
 * Tests all 6 translation path combinations:
 * 1. English → Latin (en → es)
 * 2. English → Native (en → hi)
 * 3. Latin → Latin (es → fr)
 * 4. Latin → Native (es → hi)
 * 5. Native → Latin (hi → es)
 * 6. Native → Native (hi → ar)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, ArrowRight } from 'lucide-react';
import { semanticTranslate, getSupportedLanguages, type LanguageInfo } from '@/lib/translation/semantic-translate';

interface TestCase {
  id: string;
  name: string;
  description: string;
  sourceCode: string;
  targetCode: string;
  sourceScript: 'Latin' | 'Native';
  targetScript: 'Latin' | 'Native';
  inputText: string;
  expectedBehavior: string;
}

interface TestResult {
  id: string;
  output: string;
  pivot?: string;
  confidence: number;
  success: boolean;
  error?: string;
  duration: number;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'en-latin',
    name: 'English → Latin',
    description: 'Direct translation from English to Spanish',
    sourceCode: 'en',
    targetCode: 'es',
    sourceScript: 'Latin',
    targetScript: 'Latin',
    inputText: 'Hello, how are you today?',
    expectedBehavior: 'Direct translation, no pivot needed',
  },
  {
    id: 'en-native',
    name: 'English → Native',
    description: 'Direct translation from English to Hindi (Devanagari)',
    sourceCode: 'en',
    targetCode: 'hi',
    sourceScript: 'Latin',
    targetScript: 'Native',
    inputText: 'Welcome to the application',
    expectedBehavior: 'Direct translation with script conversion to Devanagari',
  },
  {
    id: 'latin-latin',
    name: 'Latin → Latin',
    description: 'Spanish to French translation',
    sourceCode: 'es',
    targetCode: 'fr',
    sourceScript: 'Latin',
    targetScript: 'Latin',
    inputText: 'Buenos dias amigo',
    expectedBehavior: 'Try direct first, fallback to English pivot',
  },
  {
    id: 'latin-native',
    name: 'Latin → Native',
    description: 'Spanish to Arabic translation',
    sourceCode: 'es',
    targetCode: 'ar',
    sourceScript: 'Latin',
    targetScript: 'Native',
    inputText: 'Gracias por tu ayuda',
    expectedBehavior: 'English pivot: Spanish → English → Arabic',
  },
  {
    id: 'native-latin',
    name: 'Native → Latin',
    description: 'Hindi to Portuguese translation',
    sourceCode: 'hi',
    targetCode: 'pt',
    sourceScript: 'Native',
    targetScript: 'Latin',
    inputText: 'नमस्ते दोस्त',
    expectedBehavior: 'English pivot: Hindi → English → Portuguese',
  },
  {
    id: 'native-native',
    name: 'Native → Native',
    description: 'Hindi to Arabic translation',
    sourceCode: 'hi',
    targetCode: 'ar',
    sourceScript: 'Native',
    targetScript: 'Native',
    inputText: 'आपका दिन शुभ हो',
    expectedBehavior: 'English pivot: Hindi → English → Arabic',
  },
];

export default function TranslationTestPanel() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [languageCount, setLanguageCount] = useState(0);
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);

  useEffect(() => {
    getSupportedLanguages().then(langs => {
      setLanguages(langs);
      setLanguageCount(langs.length);
    });
  }, []);

  const runTest = async (testCase: TestCase) => {
    setRunning(testCase.id);
    const startTime = performance.now();

    try {
      const result = await semanticTranslate(
        testCase.inputText,
        testCase.sourceCode,
        testCase.targetCode
      );

      const duration = performance.now() - startTime;

      setResults(prev => ({
        ...prev,
        [testCase.id]: {
          id: testCase.id,
          output: result.text,
          pivot: result.englishPivot,
          confidence: result.confidence,
          success: result.isTranslated || result.text !== testCase.inputText,
          error: result.error,
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
    }
  };

  const getLanguageName = (code: string) => {
    const lang = languages.find(l => l.code === code);
    return lang?.name || code;
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Semantic Translation Test Panel</span>
            <Badge variant="secondary">{languageCount} languages</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Testing all 6 translation path combinations with English semantic pivot.
          </p>
          <Button onClick={runAllTests} disabled={running !== null}>
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              'Run All Tests'
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {TEST_CASES.map((testCase) => {
          const result = results[testCase.id];
          const isRunning = running === testCase.id;

          return (
            <Card key={testCase.id} className={result?.success ? 'border-green-500/50' : result?.error ? 'border-red-500/50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant={testCase.sourceScript === 'Latin' ? 'default' : 'secondary'}>
                      {testCase.sourceScript}
                    </Badge>
                    <ArrowRight className="w-4 h-4" />
                    <Badge variant={testCase.targetScript === 'Latin' ? 'default' : 'secondary'}>
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
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">From:</span>{' '}
                    <span className="capitalize">{getLanguageName(testCase.sourceCode)}</span>
                    <span className="text-muted-foreground"> ({testCase.sourceCode})</span>
                  </div>
                  <div>
                    <span className="font-medium">To:</span>{' '}
                    <span className="capitalize">{getLanguageName(testCase.targetCode)}</span>
                    <span className="text-muted-foreground"> ({testCase.targetCode})</span>
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm font-medium mb-1">Input:</div>
                  <div className="text-foreground">{testCase.inputText}</div>
                </div>

                <div className="text-xs text-muted-foreground italic">
                  Expected: {testCase.expectedBehavior}
                </div>

                {result && (
                  <div className={`p-3 rounded-md ${result.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
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
                    </div>

                    <div className="text-sm">
                      <div className="font-medium">Output:</div>
                      <div className="text-foreground mt-1">{result.output || '(empty)'}</div>
                    </div>

                    {result.pivot && (
                      <div className="text-sm mt-2">
                        <div className="font-medium text-blue-500">English Pivot:</div>
                        <div className="text-muted-foreground">{result.pivot}</div>
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

      {/* Language Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Script Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">
                {languages.filter(l => l.script === 'Latin').length}
              </div>
              <div className="text-sm text-muted-foreground">Latin Script</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {languages.filter(l => l.script === 'Native').length}
              </div>
              <div className="text-sm text-muted-foreground">Native Scripts</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
