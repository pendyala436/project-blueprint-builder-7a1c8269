/**
 * Translation Test Page
 * Tests "How are you?" translation across 386 languages
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Play, Search, Globe, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  translate, 
  getSupportedLanguages, 
  testTranslationPairs,
} from "@/lib/translation";

interface TranslationTestResult {
  source: string;
  target: string;
  originalText: string;
  translatedText: string;
  englishPivot?: string;
  success: boolean;
  isTransliterated: boolean;
}

interface LanguageResult {
  language: string;
  translation: string;
  success: boolean;
  isTransliterated: boolean;
}

export default function TranslationTestPage() {
  const navigate = useNavigate();
  const [testText, setTestText] = useState("How are you?");
  const [results, setResults] = useState<LanguageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [testSummary, setTestSummary] = useState("");
  const [languageCount, setLanguageCount] = useState(0);

  useEffect(() => {
    const languages = getSupportedLanguages();
    setLanguageCount(languages.length);
  }, []);

  const runTranslationTest = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      // Run the built-in test
      const testResult = await testTranslationPairs(testText);
      setTestSummary(testResult.summary);
      
      // Convert to our format
      const formattedResults: LanguageResult[] = testResult.testedPairs.map((pair: TranslationTestResult) => ({
        language: `${pair.source} → ${pair.target}`,
        translation: pair.translatedText,
        success: pair.success,
        isTransliterated: pair.isTransliterated,
      }));
      
      setResults(formattedResults);
      
      // Now test more language pairs - sample of languages
      const sampleLanguages = [
        "hindi", "bengali", "telugu", "tamil", "marathi", "gujarati", 
        "kannada", "malayalam", "punjabi", "odia", "urdu", "assamese",
        "spanish", "french", "german", "italian", "portuguese", "dutch",
        "russian", "ukrainian", "polish", "czech", "romanian", "hungarian",
        "arabic", "persian", "turkish", "hebrew", "greek",
        "chinese (mandarin)", "japanese", "korean", "thai", "vietnamese",
        "indonesian", "malay", "tagalog", "burmese", "khmer",
        "swahili", "amharic", "yoruba", "hausa", "zulu"
      ];
      
      const additionalResults: LanguageResult[] = [];
      
      for (const targetLang of sampleLanguages) {
        try {
          const result = await translate(testText, "english", targetLang);
          additionalResults.push({
            language: `english → ${targetLang}`,
            translation: result.text,
            success: true,
            isTransliterated: result.isTransliterated,
          });
        } catch (err) {
          additionalResults.push({
            language: `english → ${targetLang}`,
            translation: testText,
            success: false,
            isTransliterated: false,
          });
        }
      }
      
      setResults(prev => [...prev, ...additionalResults]);
      
    } catch (error) {
      console.error("Translation test error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResults = results.filter(r =>
    r.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.translation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const successCount = results.filter(r => r.success).length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Translation Test
            </h1>
            <p className="text-muted-foreground">
              Testing across {languageCount} languages
            </p>
          </div>
        </div>

        {/* Test Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Phrase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to translate..."
              className="text-lg"
            />
            <Button
              onClick={runTranslationTest}
              disabled={isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isLoading ? "Testing..." : "Run Translation Test"}
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        {testSummary && (
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-4">
              <p className="font-medium">{testSummary}</p>
              <div className="flex gap-4 mt-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {successCount} Successful
                </Badge>
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {results.length - successCount} Failed
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Results ({filteredResults.length})
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter results..."
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? "bg-accent/30 border-border"
                          : "bg-destructive/10 border-destructive/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          {result.language}
                        </span>
                        <div className="flex gap-1">
                          {result.isTransliterated && (
                            <Badge variant="secondary" className="text-xs">
                              Transliterated
                            </Badge>
                          )}
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </div>
                      <p className="text-lg font-medium">{result.translation}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
