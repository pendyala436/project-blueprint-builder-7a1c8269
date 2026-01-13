/**
 * Translation & Transliteration Test Page
 * ========================================
 * Live demonstration of the translation system:
 * 1. Real-time transliteration (Latin → Native script)
 * 2. Semantic translation between languages
 * 3. Full chat flow simulation
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Languages, Keyboard, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useRealtimeChatTranslation } from '@/hooks/useRealtimeChatTranslation';
import { dynamicTransliterate, isLatinScriptLanguage } from '@/lib/translation/dynamic-transliterator';
import { translateText } from '@/lib/translation/translate';

interface TestResult {
  id: string;
  input: string;
  output: string;
  type: 'transliteration' | 'translation';
  sourceLanguage: string;
  targetLanguage: string;
  processingTime: number;
  success: boolean;
  timestamp: Date;
}

const SAMPLE_LANGUAGES = [
  { value: 'english', label: 'English', script: 'Latin' },
  { value: 'hindi', label: 'Hindi', script: 'Devanagari' },
  { value: 'telugu', label: 'Telugu', script: 'Telugu' },
  { value: 'tamil', label: 'Tamil', script: 'Tamil' },
  { value: 'kannada', label: 'Kannada', script: 'Kannada' },
  { value: 'malayalam', label: 'Malayalam', script: 'Malayalam' },
  { value: 'bengali', label: 'Bengali', script: 'Bengali' },
  { value: 'gujarati', label: 'Gujarati', script: 'Gujarati' },
  { value: 'marathi', label: 'Marathi', script: 'Devanagari' },
  { value: 'punjabi', label: 'Punjabi', script: 'Gurmukhi' },
  { value: 'spanish', label: 'Spanish', script: 'Latin' },
  { value: 'french', label: 'French', script: 'Latin' },
  { value: 'german', label: 'German', script: 'Latin' },
  { value: 'arabic', label: 'Arabic', script: 'Arabic' },
  { value: 'russian', label: 'Russian', script: 'Cyrillic' },
  { value: 'japanese', label: 'Japanese', script: 'Japanese' },
  { value: 'korean', label: 'Korean', script: 'Hangul' },
  { value: 'chinese', label: 'Chinese', script: 'Han' },
];

const SAMPLE_INPUTS = {
  hindi: ['namaste', 'kaise ho', 'aap kahan se ho', 'mera naam', 'dhanyavaad'],
  telugu: ['bagunnava', 'ela unnavu', 'nenu manchi ga unna', 'dhanyavadalu'],
  tamil: ['vanakkam', 'eppadi irukkinga', 'nandri', 'ungal peyar enna'],
  kannada: ['namaskara', 'hegiddira', 'dhanyavadagalu', 'ninna hesaru enu'],
  malayalam: ['namaskaram', 'sughamano', 'nanni', 'ningalude peru enthaanu'],
  bengali: ['namaskar', 'kemon acho', 'dhonyobad', 'tomar naam ki'],
  english: ['hello', 'how are you', 'thank you', 'what is your name'],
  spanish: ['hola', 'como estas', 'gracias', 'como te llamas'],
  french: ['bonjour', 'comment allez-vous', 'merci', 'comment vous appelez-vous'],
};

export default function TranslationTestPage() {
  const [senderLanguage, setSenderLanguage] = useState('english');
  const [receiverLanguage, setReceiverLanguage] = useState('hindi');
  const [inputText, setInputText] = useState('');
  const [livePreview, setLivePreview] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { getLivePreview, processMessage, isReady } = useRealtimeChatTranslation(
    senderLanguage,
    receiverLanguage
  );

  // Real-time transliteration preview
  const handleInputChange = useCallback((value: string) => {
    setInputText(value);
    
    // Get live preview (transliteration)
    const startTime = performance.now();
    const preview = getLivePreview(value, senderLanguage);
    const processingTime = performance.now() - startTime;
    
    setLivePreview(preview.preview);
    
    console.log('[TranslationTest] Live preview:', {
      input: value,
      output: preview.preview,
      language: senderLanguage,
      isLatin: preview.isLatin,
      processingTime: `${processingTime.toFixed(2)}ms`,
    });
  }, [senderLanguage, getLivePreview]);

  // Test transliteration only
  const testTransliteration = useCallback(() => {
    if (!inputText.trim()) return;

    const startTime = performance.now();
    const result = dynamicTransliterate(inputText, senderLanguage);
    const processingTime = performance.now() - startTime;

    const testResult: TestResult = {
      id: `trans-${Date.now()}`,
      input: inputText,
      output: result,
      type: 'transliteration',
      sourceLanguage: 'Latin',
      targetLanguage: senderLanguage,
      processingTime,
      success: result !== inputText,
      timestamp: new Date(),
    };

    setTestResults(prev => [testResult, ...prev]);
    
    console.log('[TranslationTest] Transliteration:', testResult);
  }, [inputText, senderLanguage]);

  // Test full translation flow
  const testTranslation = useCallback(async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    const startTime = performance.now();

    try {
      // First get sender view (transliterated if needed)
      const senderView = isLatinScriptLanguage(senderLanguage) 
        ? inputText 
        : dynamicTransliterate(inputText, senderLanguage);

      // Then translate to receiver's language
      const translationResult = await translateText(senderView, senderLanguage, receiverLanguage);
      const processingTime = performance.now() - startTime;

      const testResult: TestResult = {
        id: `full-${Date.now()}`,
        input: inputText,
        output: translationResult.text,
        type: 'translation',
        sourceLanguage: senderLanguage,
        targetLanguage: receiverLanguage,
        processingTime,
        success: translationResult.isTranslated,
        timestamp: new Date(),
      };

      setTestResults(prev => [testResult, ...prev]);
      
      console.log('[TranslationTest] Full translation:', {
        ...testResult,
        senderView,
        receiverView: translationResult.text,
        englishPivot: translationResult.englishPivot,
      });
    } catch (error) {
      console.error('[TranslationTest] Translation error:', error);
      
      const testResult: TestResult = {
        id: `error-${Date.now()}`,
        input: inputText,
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'translation',
        sourceLanguage: senderLanguage,
        targetLanguage: receiverLanguage,
        processingTime: performance.now() - startTime,
        success: false,
        timestamp: new Date(),
      };
      setTestResults(prev => [testResult, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, senderLanguage, receiverLanguage]);

  // Test chat message flow
  const testChatFlow = useCallback(async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    const startTime = performance.now();

    try {
      const result = await processMessage(inputText, senderLanguage, receiverLanguage);
      const processingTime = performance.now() - startTime;

      // Add sender view result
      setTestResults(prev => [{
        id: `chat-sender-${Date.now()}`,
        input: inputText,
        output: result.senderView,
        type: 'transliteration',
        sourceLanguage: 'Latin input',
        targetLanguage: `${senderLanguage} (sender sees)`,
        processingTime: result.processingTime,
        success: result.wasTransliterated || result.senderView === inputText,
        timestamp: new Date(),
      }, {
        id: `chat-receiver-${Date.now()}`,
        input: result.senderView,
        output: result.receiverView,
        type: 'translation',
        sourceLanguage: senderLanguage,
        targetLanguage: `${receiverLanguage} (receiver sees)`,
        processingTime,
        success: result.wasTranslated,
        timestamp: new Date(),
      }, ...prev]);

      console.log('[TranslationTest] Chat flow:', result);
    } catch (error) {
      console.error('[TranslationTest] Chat flow error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, senderLanguage, receiverLanguage, processMessage]);

  // Run sample tests
  const runSampleTests = useCallback(async () => {
    const samples = SAMPLE_INPUTS[senderLanguage as keyof typeof SAMPLE_INPUTS] || SAMPLE_INPUTS.english;
    
    for (const sample of samples.slice(0, 3)) {
      setInputText(sample);
      handleInputChange(sample);
      await new Promise(resolve => setTimeout(resolve, 500));
      await testChatFlow();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }, [senderLanguage, handleInputChange, testChatFlow]);

  const clearResults = () => setTestResults([]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Languages className="h-8 w-8 text-primary" />
            Translation & Transliteration Test
          </h1>
          <p className="text-muted-foreground">
            Test the real-time transliteration and translation system
          </p>
          <Badge variant={isReady ? 'default' : 'destructive'}>
            {isReady ? 'System Ready' : 'System Loading...'}
          </Badge>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Simulation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sender's Language (Mother Tongue)</Label>
                <Select value={senderLanguage} onValueChange={setSenderLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAMPLE_LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label} ({lang.script})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Receiver's Language (Mother Tongue)</Label>
                <Select value={receiverLanguage} onValueChange={setReceiverLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAMPLE_LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label} ({lang.script})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Input Area */}
            <div className="space-y-2">
              <Label>Type in Latin Script (or native)</Label>
              <Input
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Type here... (e.g., ${SAMPLE_INPUTS[senderLanguage as keyof typeof SAMPLE_INPUTS]?.[0] || 'hello'})`}
                className="text-lg"
              />
            </div>

            {/* Live Preview */}
            {livePreview && livePreview !== inputText && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Keyboard className="h-4 w-4" />
                  Live Transliteration Preview ({senderLanguage})
                </div>
                <div className="text-2xl font-medium">{livePreview}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={testTransliteration} variant="outline" disabled={!inputText.trim()}>
                <Keyboard className="h-4 w-4 mr-2" />
                Test Transliteration
              </Button>
              <Button onClick={testTranslation} variant="outline" disabled={!inputText.trim() || isProcessing}>
                <Languages className="h-4 w-4 mr-2" />
                Test Translation
              </Button>
              <Button onClick={testChatFlow} disabled={!inputText.trim() || isProcessing}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Full Chat Flow
              </Button>
              <Button onClick={runSampleTests} variant="secondary" disabled={isProcessing}>
                Run Sample Tests
              </Button>
              <Button onClick={clearResults} variant="ghost">
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results ({testResults.length})</span>
              {isProcessing && (
                <Badge variant="secondary" className="animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                  Processing...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No test results yet. Type something and click a test button!
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {testResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-4 rounded-lg border ${
                      result.success ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant={result.type === 'transliteration' ? 'secondary' : 'default'}>
                          {result.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {result.sourceLanguage} <ArrowRight className="h-3 w-3 inline" /> {result.targetLanguage}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {result.processingTime.toFixed(2)}ms
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Input:</div>
                        <div className="font-mono bg-background p-2 rounded text-lg">{result.input}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Output:</div>
                        <div className="font-mono bg-background p-2 rounded text-lg">{result.output}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Inputs by Language</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {Object.entries(SAMPLE_INPUTS).slice(0, 8).map(([lang, samples]) => (
                <div key={lang} className="space-y-1">
                  <div className="font-medium capitalize">{lang}</div>
                  {samples.slice(0, 3).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSenderLanguage(lang);
                        setInputText(s);
                        handleInputChange(s);
                      }}
                      className="block text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
