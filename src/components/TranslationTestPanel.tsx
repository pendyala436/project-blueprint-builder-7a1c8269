/**
 * Translation Test Panel - All 8 Translation Paths
 * =================================================
 * Tests all 8 translation path combinations using "how are you" and "i am fine":
 * 
 * 1. Native → Native (Hindi → Tamil)
 * 2. Native → Latin (Hindi → Spanish)
 * 3. Latin → Native (Spanish → Telugu)
 * 4. Latin → Latin (Spanish → French)
 * 5. English → Native (English → Hindi)
 * 6. English → Latin (English → Spanish)
 * 7. Latin → English (French → English)
 * 8. Native → English (Bengali → English)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, ArrowRight, Globe, Languages, Play, RefreshCw } from 'lucide-react';
import { 
  translateText, 
  getLanguageCount, 
  isReady,
  isLatinScriptLanguage,
  getLanguageInfo,
  type TranslationResult
} from '@/lib/translation/translate';

// Test phrases
const TEST_PHRASES = {
  howAreYou: {
    english: 'how are you',
    hindi: 'आप कैसे हैं',
    hindiLatin: 'aap kaise hain',
    tamil: 'எப்படி இருக்கிறீர்கள்',
    tamilLatin: 'eppadi irukkiraargal',
    telugu: 'మీరు ఎలా ఉన్నారు',
    teluguLatin: 'meeru ela unnaru',
    bengali: 'আপনি কেমন আছেন',
    bengaliLatin: 'apni kemon achen',
    spanish: 'cómo estás',
    french: 'comment allez-vous',
    arabic: 'كيف حالك',
    arabicLatin: 'kayf haluk',
    kannada: 'ಹೇಗಿದ್ದೀರಾ',
    kannadaLatin: 'hegiddira',
    malayalam: 'സുഖമാണോ',
    malayalamLatin: 'sughamano',
  },
  iAmFine: {
    english: 'i am fine',
    hindi: 'मैं ठीक हूँ',
    hindiLatin: 'main theek hoon',
    tamil: 'நான் நலமாக இருக்கிறேன்',
    tamilLatin: 'naan nalamaga irukkiren',
    telugu: 'నేను బాగున్నాను',
    teluguLatin: 'nenu baagunnanu',
    bengali: 'আমি ভালো আছি',
    bengaliLatin: 'ami bhalo achhi',
    spanish: 'estoy bien',
    french: 'je vais bien',
    arabic: 'أنا بخير',
    arabicLatin: 'ana bikhayr',
    kannada: 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ',
    kannadaLatin: 'naanu chennaagiddene',
    malayalam: 'എനിക്ക് സുഖമാണ്',
    malayalamLatin: 'enikku sugham',
  }
};

interface TestCase {
  id: string;
  pathNumber: number;
  pathName: string;
  description: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  sourceScript: 'Latin' | 'Native';
  targetScript: 'Latin' | 'Native';
  expectedBehavior: string;
  category: 'howAreYou' | 'iAmFine';
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

// All 8 translation paths for "how are you"
const HOW_ARE_YOU_TESTS: TestCase[] = [
  // Path 1: Native → Native
  {
    id: 'hay-native-to-native',
    pathNumber: 1,
    pathName: 'Native → Native',
    description: 'Hindi (Devanagari) to Tamil (Tamil script)',
    sourceLanguage: 'hindi',
    targetLanguage: 'tamil',
    sourceText: TEST_PHRASES.howAreYou.hindi,
    sourceScript: 'Native',
    targetScript: 'Native',
    expectedBehavior: 'Hindi → English pivot → Tamil',
    category: 'howAreYou',
  },
  // Path 2: Native → Latin
  {
    id: 'hay-native-to-latin',
    pathNumber: 2,
    pathName: 'Native → Latin',
    description: 'Bengali (Bengali script) to Spanish',
    sourceLanguage: 'bengali',
    targetLanguage: 'spanish',
    sourceText: TEST_PHRASES.howAreYou.bengali,
    sourceScript: 'Native',
    targetScript: 'Latin',
    expectedBehavior: 'Bengali → English pivot → Spanish',
    category: 'howAreYou',
  },
  // Path 3: Latin → Native
  {
    id: 'hay-latin-to-native',
    pathNumber: 3,
    pathName: 'Latin → Native',
    description: 'Spanish to Telugu (Telugu script)',
    sourceLanguage: 'spanish',
    targetLanguage: 'telugu',
    sourceText: TEST_PHRASES.howAreYou.spanish,
    sourceScript: 'Latin',
    targetScript: 'Native',
    expectedBehavior: 'Spanish → English pivot → Telugu',
    category: 'howAreYou',
  },
  // Path 4: Latin → Latin
  {
    id: 'hay-latin-to-latin',
    pathNumber: 4,
    pathName: 'Latin → Latin',
    description: 'Spanish to French (both Latin script)',
    sourceLanguage: 'spanish',
    targetLanguage: 'french',
    sourceText: TEST_PHRASES.howAreYou.spanish,
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct Latin→Latin (no pivot needed)',
    category: 'howAreYou',
  },
  // Path 5: English → Native
  {
    id: 'hay-english-to-native',
    pathNumber: 5,
    pathName: 'English → Native',
    description: 'English to Hindi (Devanagari)',
    sourceLanguage: 'english',
    targetLanguage: 'hindi',
    sourceText: TEST_PHRASES.howAreYou.english,
    sourceScript: 'Latin',
    targetScript: 'Native',
    expectedBehavior: 'Direct English → Hindi native script',
    category: 'howAreYou',
  },
  // Path 6: English → Latin
  {
    id: 'hay-english-to-latin',
    pathNumber: 6,
    pathName: 'English → Latin',
    description: 'English to Spanish',
    sourceLanguage: 'english',
    targetLanguage: 'spanish',
    sourceText: TEST_PHRASES.howAreYou.english,
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct English → Spanish (Latin)',
    category: 'howAreYou',
  },
  // Path 7: Latin → English
  {
    id: 'hay-latin-to-english',
    pathNumber: 7,
    pathName: 'Latin → English',
    description: 'French to English',
    sourceLanguage: 'french',
    targetLanguage: 'english',
    sourceText: TEST_PHRASES.howAreYou.french,
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct French → English extraction',
    category: 'howAreYou',
  },
  // Path 8: Native → English
  {
    id: 'hay-native-to-english',
    pathNumber: 8,
    pathName: 'Native → English',
    description: 'Kannada (Kannada script) to English',
    sourceLanguage: 'kannada',
    targetLanguage: 'english',
    sourceText: TEST_PHRASES.howAreYou.kannada,
    sourceScript: 'Native',
    targetScript: 'Latin',
    expectedBehavior: 'Kannada → English extraction',
    category: 'howAreYou',
  },
];

// All 8 translation paths for "i am fine"
const I_AM_FINE_TESTS: TestCase[] = [
  // Path 1: Native → Native
  {
    id: 'iaf-native-to-native',
    pathNumber: 1,
    pathName: 'Native → Native',
    description: 'Telugu (Telugu script) to Kannada (Kannada script)',
    sourceLanguage: 'telugu',
    targetLanguage: 'kannada',
    sourceText: TEST_PHRASES.iAmFine.telugu,
    sourceScript: 'Native',
    targetScript: 'Native',
    expectedBehavior: 'Telugu → English pivot → Kannada',
    category: 'iAmFine',
  },
  // Path 2: Native → Latin
  {
    id: 'iaf-native-to-latin',
    pathNumber: 2,
    pathName: 'Native → Latin',
    description: 'Hindi (Devanagari) to French',
    sourceLanguage: 'hindi',
    targetLanguage: 'french',
    sourceText: TEST_PHRASES.iAmFine.hindi,
    sourceScript: 'Native',
    targetScript: 'Latin',
    expectedBehavior: 'Hindi → English pivot → French',
    category: 'iAmFine',
  },
  // Path 3: Latin → Native
  {
    id: 'iaf-latin-to-native',
    pathNumber: 3,
    pathName: 'Latin → Native',
    description: 'French to Malayalam (Malayalam script)',
    sourceLanguage: 'french',
    targetLanguage: 'malayalam',
    sourceText: TEST_PHRASES.iAmFine.french,
    sourceScript: 'Latin',
    targetScript: 'Native',
    expectedBehavior: 'French → English pivot → Malayalam',
    category: 'iAmFine',
  },
  // Path 4: Latin → Latin
  {
    id: 'iaf-latin-to-latin',
    pathNumber: 4,
    pathName: 'Latin → Latin',
    description: 'French to Spanish (both Latin script)',
    sourceLanguage: 'french',
    targetLanguage: 'spanish',
    sourceText: TEST_PHRASES.iAmFine.french,
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct Latin→Latin (no pivot needed)',
    category: 'iAmFine',
  },
  // Path 5: English → Native
  {
    id: 'iaf-english-to-native',
    pathNumber: 5,
    pathName: 'English → Native',
    description: 'English to Bengali (Bengali script)',
    sourceLanguage: 'english',
    targetLanguage: 'bengali',
    sourceText: TEST_PHRASES.iAmFine.english,
    sourceScript: 'Latin',
    targetScript: 'Native',
    expectedBehavior: 'Direct English → Bengali native script',
    category: 'iAmFine',
  },
  // Path 6: English → Latin
  {
    id: 'iaf-english-to-latin',
    pathNumber: 6,
    pathName: 'English → Latin',
    description: 'English to French',
    sourceLanguage: 'english',
    targetLanguage: 'french',
    sourceText: TEST_PHRASES.iAmFine.english,
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct English → French (Latin)',
    category: 'iAmFine',
  },
  // Path 7: Latin → English
  {
    id: 'iaf-latin-to-english',
    pathNumber: 7,
    pathName: 'Latin → English',
    description: 'Spanish to English',
    sourceLanguage: 'spanish',
    targetLanguage: 'english',
    sourceText: TEST_PHRASES.iAmFine.spanish,
    sourceScript: 'Latin',
    targetScript: 'Latin',
    expectedBehavior: 'Direct Spanish → English extraction',
    category: 'iAmFine',
  },
  // Path 8: Native → English
  {
    id: 'iaf-native-to-english',
    pathNumber: 8,
    pathName: 'Native → English',
    description: 'Tamil (Tamil script) to English',
    sourceLanguage: 'tamil',
    targetLanguage: 'english',
    sourceText: TEST_PHRASES.iAmFine.tamil,
    sourceScript: 'Native',
    targetScript: 'Latin',
    expectedBehavior: 'Tamil → English extraction',
    category: 'iAmFine',
  },
];

const ALL_TESTS = [...HOW_ARE_YOU_TESTS, ...I_AM_FINE_TESTS];

export default function TranslationTestPanel() {
  const [results, setResults] = useState<Record<string, TestResultData>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [languageCount, setLanguageCount] = useState(0);
  const [systemReady, setSystemReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'howAreYou' | 'iAmFine' | 'all'>('all');

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

  const runAllTests = async (tests: TestCase[]) => {
    setRunningAll(true);
    for (const testCase of tests) {
      await runTest(testCase);
      await new Promise(r => setTimeout(r, 50));
    }
    setRunningAll(false);
  };

  const clearResults = () => {
    setResults({});
  };

  const getTestsForTab = (): TestCase[] => {
    switch (activeTab) {
      case 'howAreYou': return HOW_ARE_YOU_TESTS;
      case 'iAmFine': return I_AM_FINE_TESTS;
      default: return ALL_TESTS;
    }
  };

  const currentTests = getTestsForTab();
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalRun = Object.keys(results).length;

  const getScriptBadge = (lang: string) => {
    const info = getLanguageInfo(lang);
    const isLatin = isLatinScriptLanguage(lang);
    return (
      <Badge variant={isLatin ? "secondary" : "default"} className="text-xs">
        {info?.script || (isLatin ? 'Latin' : 'Native')}
      </Badge>
    );
  };

  const getPathBadge = (pathNumber: number) => {
    const colors: Record<number, string> = {
      1: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      2: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      3: 'bg-green-500/20 text-green-300 border-green-500/30',
      4: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      5: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      6: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      7: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      8: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return (
      <Badge className={`text-xs border ${colors[pathNumber] || ''}`}>
        Path {pathNumber}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto bg-background min-h-screen">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Languages className="h-6 w-6 text-primary" />
                8-Path Translation Test Panel
              </CardTitle>
              <CardDescription className="mt-2">
                Testing "how are you" & "i am fine" across all 8 translation paths
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {languageCount} languages
              </Badge>
              <Badge variant={systemReady ? "default" : "destructive"}>
                {systemReady ? '✓ Ready' : '✗ Not Ready'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Button 
              onClick={() => runAllTests(currentTests)} 
              disabled={runningAll || running !== null || !systemReady}
              className="gap-2"
            >
              {runningAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running {activeTab === 'all' ? '16' : '8'} Tests...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run All Tests
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearResults} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Clear Results
            </Button>
            {totalRun > 0 && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {successCount}/{totalRun} passed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All 16 Tests</TabsTrigger>
          <TabsTrigger value="howAreYou">"How are you" (8)</TabsTrigger>
          <TabsTrigger value="iAmFine">"I am fine" (8)</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-4">
          {currentTests.map((testCase) => {
            const result = results[testCase.id];
            const isRunning = running === testCase.id;

            return (
              <Card 
                key={testCase.id} 
                className={`transition-all duration-300 ${
                  result?.success ? 'border-green-500/50 bg-green-500/5' : 
                  result?.error ? 'border-red-500/50 bg-red-500/5' : 
                  isRunning ? 'border-primary bg-primary/5 animate-pulse' : 'border-muted'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPathBadge(testCase.pathNumber)}
                      <CardTitle className="text-lg">
                        {testCase.pathName}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs capitalize">
                        {testCase.category === 'howAreYou' ? 'how are you' : 'i am fine'}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runTest(testCase)}
                      disabled={isRunning || runningAll}
                    >
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                    </Button>
                  </div>
                  <CardDescription>{testCase.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Language Flow */}
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">From:</span>
                      <span className="font-mono bg-muted px-2 py-0.5 rounded capitalize">
                        {testCase.sourceLanguage}
                      </span>
                      {getScriptBadge(testCase.sourceLanguage)}
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary" />
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">To:</span>
                      <span className="font-mono bg-muted px-2 py-0.5 rounded capitalize">
                        {testCase.targetLanguage}
                      </span>
                      {getScriptBadge(testCase.targetLanguage)}
                    </div>
                  </div>

                  {/* Input */}
                  <div className="bg-muted/50 p-3 rounded-md border">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Input ({testCase.sourceScript} script):</div>
                    <div className="text-foreground font-medium text-lg">{testCase.sourceText}</div>
                  </div>

                  {/* Expected Behavior */}
                  <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                    <span className="font-medium">Expected:</span> {testCase.expectedBehavior}
                  </div>

                  {/* Result */}
                  {result && (
                    <div className={`p-4 rounded-md border ${
                      result.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        {result.success ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-medium">
                          {result.success ? 'Success' : 'Failed'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({result.duration.toFixed(1)}ms)
                        </span>
                        {result.isTranslated && (
                          <Badge variant="outline" className="text-xs bg-primary/10">Translated</Badge>
                        )}
                      </div>

                      {/* Output */}
                      <div className="bg-background/50 p-3 rounded border">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Output ({testCase.targetScript} script):</div>
                        <div className="text-foreground font-medium text-xl">
                          {result.output || '(empty)'}
                        </div>
                      </div>

                      {/* English Pivot */}
                      {result.pivot && (
                        <div className="mt-2 p-2 bg-blue-500/10 rounded border border-blue-500/30">
                          <div className="text-xs font-medium text-blue-400">🌐 English Meaning:</div>
                          <div className="text-sm text-blue-300">{result.pivot}</div>
                        </div>
                      )}

                      {/* Error */}
                      {result.error && (
                        <div className="mt-2 text-sm text-red-400">
                          Error: {result.error}
                        </div>
                      )}

                      {/* Confidence */}
                      <div className="mt-2 text-xs text-muted-foreground">
                        Confidence: {(result.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary">{languageCount}</div>
              <div className="text-sm text-muted-foreground">Languages</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-500">{successCount}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-3xl font-bold">{totalRun}</div>
              <div className="text-sm text-muted-foreground">Tested</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-3xl font-bold">8</div>
              <div className="text-sm text-muted-foreground">Translation Paths</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Path Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">8 Translation Paths Explained</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
              {getPathBadge(1)}
              <div>
                <span className="font-medium">Native → Native:</span>
                <span className="text-muted-foreground ml-1">Hindi → Tamil (via English pivot)</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
              {getPathBadge(2)}
              <div>
                <span className="font-medium">Native → Latin:</span>
                <span className="text-muted-foreground ml-1">Bengali → Spanish (via English pivot)</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
              {getPathBadge(3)}
              <div>
                <span className="font-medium">Latin → Native:</span>
                <span className="text-muted-foreground ml-1">Spanish → Telugu (via English pivot)</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
              {getPathBadge(4)}
              <div>
                <span className="font-medium">Latin → Latin:</span>
                <span className="text-muted-foreground ml-1">Spanish → French (direct, no pivot)</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
              {getPathBadge(5)}
              <div>
                <span className="font-medium">English → Native:</span>
                <span className="text-muted-foreground ml-1">English → Hindi (direct conversion)</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
              {getPathBadge(6)}
              <div>
                <span className="font-medium">English → Latin:</span>
                <span className="text-muted-foreground ml-1">English → Spanish (direct)</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
              {getPathBadge(7)}
              <div>
                <span className="font-medium">Latin → English:</span>
                <span className="text-muted-foreground ml-1">French → English (extraction)</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
              {getPathBadge(8)}
              <div>
                <span className="font-medium">Native → English:</span>
                <span className="text-muted-foreground ml-1">Kannada → English (extraction)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
