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
import { ArrowRight, Languages, Keyboard, MessageSquare, CheckCircle, Clock, AlertCircle, Globe } from 'lucide-react';
import { useRealtimeChatTranslation } from '@/hooks/useRealtimeChatTranslation';
import { dynamicTransliterate, isLatinScriptLanguage } from '@/lib/translation/dynamic-transliterator';
import { translateText } from '@/lib/translation/translate';
import UniversalTranslator from '@/components/UniversalTranslator';

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

// Auto-test combinations for "how are you"
const HOW_ARE_YOU_TESTS = [
  { sender: 'english', receiver: 'hindi', input: 'how are you', expectedTranslit: 'how are you' },
  { sender: 'hindi', receiver: 'english', input: 'kaise ho', expectedTranslit: 'कैसे हो' },
  { sender: 'hindi', receiver: 'telugu', input: 'kaise ho', expectedTranslit: 'कैसे हो' },
  { sender: 'telugu', receiver: 'hindi', input: 'ela unnavu', expectedTranslit: 'ఎలా ఉన్నావు' },
  { sender: 'tamil', receiver: 'hindi', input: 'eppadi irukka', expectedTranslit: 'எப்படி இருக்க' },
  { sender: 'english', receiver: 'tamil', input: 'how are you', expectedTranslit: 'how are you' },
  { sender: 'bengali', receiver: 'english', input: 'kemon acho', expectedTranslit: 'কেমন আছো' },
  { sender: 'kannada', receiver: 'telugu', input: 'hegiddira', expectedTranslit: 'ಹೆಗಿದ್ದೀರ' },
  { sender: 'spanish', receiver: 'hindi', input: 'como estas', expectedTranslit: 'como estas' },
  { sender: 'french', receiver: 'english', input: 'comment allez-vous', expectedTranslit: 'comment allez-vous' },
];

// "My home town is near Delhi" tests across multiple languages
const HOMETOWN_DELHI_TESTS = [
  { sender: 'english', receiver: 'hindi', input: 'my home town is near delhi' },
  { sender: 'english', receiver: 'telugu', input: 'my home town is near delhi' },
  { sender: 'english', receiver: 'tamil', input: 'my home town is near delhi' },
  { sender: 'english', receiver: 'kannada', input: 'my home town is near delhi' },
  { sender: 'english', receiver: 'malayalam', input: 'my home town is near delhi' },
  { sender: 'english', receiver: 'bengali', input: 'my home town is near delhi' },
  { sender: 'english', receiver: 'gujarati', input: 'my home town is near delhi' },
  { sender: 'english', receiver: 'marathi', input: 'my home town is near delhi' },
  { sender: 'english', receiver: 'punjabi', input: 'my home town is near delhi' },
  { sender: 'hindi', receiver: 'telugu', input: 'mera gaon dilli ke paas hai' },
  { sender: 'hindi', receiver: 'tamil', input: 'mera gaon dilli ke paas hai' },
  { sender: 'hindi', receiver: 'english', input: 'mera gaon dilli ke paas hai' },
  { sender: 'telugu', receiver: 'hindi', input: 'naa ooru delhi daggaralo undi' },
  { sender: 'telugu', receiver: 'english', input: 'naa ooru delhi daggaralo undi' },
  { sender: 'tamil', receiver: 'hindi', input: 'en ooru delhi arugil ullathu' },
  { sender: 'kannada', receiver: 'telugu', input: 'nanna ooru delhi hattira ide' },
  { sender: 'bengali', receiver: 'hindi', input: 'amar bari delhi kachhe' },
  { sender: 'malayalam', receiver: 'tamil', input: 'ente naadu delhi aduthaanu' },
];

export default function TranslationTestPage() {
  const [senderLanguage, setSenderLanguage] = useState('english');
  const [receiverLanguage, setReceiverLanguage] = useState('hindi');
  const [inputText, setInputText] = useState('');
  const [livePreview, setLivePreview] = useState('');
  const [transliteratedForTranslator, setTransliteratedForTranslator] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoTestRunning, setAutoTestRunning] = useState(false);
  const [autoTestResults, setAutoTestResults] = useState<Array<{
    sender: string;
    receiver: string;
    input: string;
    transliterated: string;
    translated: string;
    success: boolean;
    time: number;
  }>>([]);
  const [hometownTestResults, setHometownTestResults] = useState<Array<{
    sender: string;
    receiver: string;
    input: string;
    transliterated: string;
    translated: string;
    success: boolean;
    time: number;
  }>>([]);
  const [hometownTestRunning, setHometownTestRunning] = useState(false);

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
    
    // Send transliterated result to Universal Translator
    // If sender's language is non-Latin, use the transliterated version
    const transliteratedText = !isLatinScriptLanguage(senderLanguage) && preview.preview !== value
      ? preview.preview
      : value;
    setTransliteratedForTranslator(transliteratedText);
    
    console.log('[TranslationTest] Live preview:', {
      input: value,
      output: preview.preview,
      language: senderLanguage,
      isLatin: preview.isLatin,
      processingTime: `${processingTime.toFixed(2)}ms`,
      sentToTranslator: transliteratedText,
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

  // Run auto "how are you" test across all language combinations
  const runHowAreYouTests = useCallback(async () => {
    setAutoTestRunning(true);
    setAutoTestResults([]);
    
    console.log('🚀 Starting "How Are You" tests across language combinations...');
    
    for (const test of HOW_ARE_YOU_TESTS) {
      const startTime = performance.now();
      
      // Get transliteration (sender sees)
      const transliterated = dynamicTransliterate(test.input, test.sender);
      
      // Get translation (receiver sees)
      let translated = '';
      let success = false;
      
      try {
        const result = await translateText(transliterated, test.sender, test.receiver);
        translated = result.text;
        success = result.isTranslated || translated.length > 0;
      } catch (err) {
        translated = `Error: ${err instanceof Error ? err.message : 'Unknown'}`;
        success = false;
      }
      
      const time = performance.now() - startTime;
      
      const testResult = {
        sender: test.sender,
        receiver: test.receiver,
        input: test.input,
        transliterated,
        translated,
        success,
        time,
      };
      
      setAutoTestResults(prev => [...prev, testResult]);
      
      console.log(`[HowAreYou] ${test.sender} → ${test.receiver}:`, {
        input: test.input,
        transliterated,
        translated,
        time: `${time.toFixed(0)}ms`,
      });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setAutoTestRunning(false);
    console.log('✅ "How Are You" tests completed!');
  }, []);

  // Run "My home town is near Delhi" tests
  const runHometownDelhiTests = useCallback(async () => {
    setHometownTestRunning(true);
    setHometownTestResults([]);
    
    console.log('🏠 Starting "My home town is near Delhi" tests across language combinations...');
    
    for (const test of HOMETOWN_DELHI_TESTS) {
      const startTime = performance.now();
      
      // Get transliteration (sender sees)
      const transliterated = dynamicTransliterate(test.input, test.sender);
      
      // Get translation (receiver sees)
      let translated = '';
      let success = false;
      
      try {
        const result = await translateText(transliterated, test.sender, test.receiver);
        translated = result.text;
        success = result.isTranslated || translated.length > 0;
      } catch (err) {
        translated = `Error: ${err instanceof Error ? err.message : 'Unknown'}`;
        success = false;
      }
      
      const time = performance.now() - startTime;
      
      const testResult = {
        sender: test.sender,
        receiver: test.receiver,
        input: test.input,
        transliterated,
        translated,
        success,
        time,
      };
      
      setHometownTestResults(prev => [...prev, testResult]);
      
      console.log(`[Hometown] ${test.sender} → ${test.receiver}:`, {
        input: test.input,
        transliterated,
        translated,
        time: `${time.toFixed(0)}ms`,
      });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setHometownTestRunning(false);
    console.log('✅ "My home town is near Delhi" tests completed!');
  }, []);

  const clearResults = () => {
    setTestResults([]);
    setAutoTestResults([]);
    setHometownTestResults([]);
  };

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

        {/* "How Are You" Auto Test Panel */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              🧪 "How Are You" - Multi-Language Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Automatically tests "how are you" across 10 language combinations to verify typing + transliteration + translation.
            </p>
            
            <Button 
              onClick={runHowAreYouTests} 
              disabled={autoTestRunning}
              className="w-full"
              size="lg"
            >
              {autoTestRunning ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests... ({autoTestResults.length}/10)
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4 mr-2" />
                  🚀 Run "How Are You" Tests
                </>
              )}
            </Button>

            {autoTestResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Sender</th>
                      <th className="text-left p-2">Receiver</th>
                      <th className="text-left p-2">Input (Latin)</th>
                      <th className="text-left p-2">Transliterated (Sender Sees)</th>
                      <th className="text-left p-2">Translated (Receiver Sees)</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoTestResults.map((result, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2 capitalize">{result.sender}</td>
                        <td className="p-2 capitalize">{result.receiver}</td>
                        <td className="p-2 font-mono">{result.input}</td>
                        <td className="p-2 text-lg">{result.transliterated}</td>
                        <td className="p-2 text-lg">{result.translated}</td>
                        <td className="p-2 text-muted-foreground">{result.time.toFixed(0)}ms</td>
                        <td className="p-2">
                          {result.success ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* "My home town is near Delhi" Test Panel */}
        <Card className="border-2 border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              🏠 "My home town is near Delhi" - Multi-Language Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Tests "my home town is near delhi" across 18 language combinations (English, Hindi, Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi).
            </p>
            
            <Button 
              onClick={runHometownDelhiTests} 
              disabled={hometownTestRunning}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {hometownTestRunning ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests... ({hometownTestResults.length}/18)
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4 mr-2" />
                  🏠 Run "Hometown Delhi" Tests
                </>
              )}
            </Button>

            {hometownTestResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Sender</th>
                      <th className="text-left p-2">Receiver</th>
                      <th className="text-left p-2">Input (Gboard Latin)</th>
                      <th className="text-left p-2">Sender Sees (Native)</th>
                      <th className="text-left p-2">Receiver Sees (Translated)</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hometownTestResults.map((result, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2 capitalize font-medium">{result.sender}</td>
                        <td className="p-2 capitalize font-medium">{result.receiver}</td>
                        <td className="p-2 font-mono text-xs">{result.input}</td>
                        <td className="p-2 text-lg unicode-text" dir="auto">{result.transliterated}</td>
                        <td className="p-2 text-lg unicode-text" dir="auto">{result.translated}</td>
                        <td className="p-2 text-muted-foreground">{result.time.toFixed(0)}ms</td>
                        <td className="p-2">
                          {result.success ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Universal Translator (Receives Typing Input)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/30 rounded-lg mb-4">
              <div className="text-sm text-muted-foreground mb-2">
                Input from typing (transliterated if non-Latin):
              </div>
              <div className="text-lg font-medium">
                {transliteratedForTranslator || '(Type above to see input here)'}
              </div>
            </div>
            <UniversalTranslator
              defaultSource={senderLanguage === 'english' ? 'en' : senderLanguage.substring(0, 2)}
              defaultTarget={receiverLanguage === 'english' ? 'en' : receiverLanguage.substring(0, 2)}
              externalInput={transliteratedForTranslator}
              compact={false}
            />
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
