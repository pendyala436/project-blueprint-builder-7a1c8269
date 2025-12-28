/**
 * DL-Translate Chat Demo Page
 * Test the multilingual chat system with 200+ languages
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Languages, Globe, ArrowRight, Play, Info } from 'lucide-react';

import { DLTranslateChatRoom, LanguageSelector, TranslationStatus } from '@/components/multilingual';
import { getNativeName, isSameLanguage } from '@/lib/dl-translate/languages';

export default function DLTranslateChatDemo() {
  const [userLanguage, setUserLanguage] = useState('english');
  const [partnerLanguage, setPartnerLanguage] = useState('hindi');
  const [showChat, setShowChat] = useState(false);
  
  // Demo IDs (in real app, these come from auth/context)
  const demoUserId = 'demo-user-001';
  const demoPartnerId = 'demo-partner-001';
  const demoChatId = `demo-chat-${Date.now()}`;

  const needsTranslation = !isSameLanguage(userLanguage, partnerLanguage);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Languages className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold">DL-Translate Chat</h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Multilingual chat system with real-time transliteration and automatic translation.
          Based on <a href="https://github.com/xhluca/dl-translate" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">dl-translate</a> supporting 200+ languages.
        </p>
      </div>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language Configuration
          </CardTitle>
          <CardDescription>
            Select your language and your chat partner's language to see translation in action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language selectors */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <div className="space-y-2 text-center">
              <label className="text-sm font-medium">Your Language</label>
              <LanguageSelector
                value={userLanguage}
                onChange={setUserLanguage}
                placeholder="Select your language"
              />
            </div>

            <ArrowRight className="h-6 w-6 text-muted-foreground hidden sm:block" />
            <div className="h-6 w-px bg-border sm:hidden" />

            <div className="space-y-2 text-center">
              <label className="text-sm font-medium">Partner's Language</label>
              <LanguageSelector
                value={partnerLanguage}
                onChange={setPartnerLanguage}
                placeholder="Select partner language"
              />
            </div>
          </div>

          {/* Translation status */}
          <TranslationStatus
            sourceLanguage={userLanguage}
            targetLanguage={partnerLanguage}
          />

          {/* Start chat button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => setShowChat(true)}
              className="gap-2"
            >
              <Play className="h-5 w-5" />
              Start Demo Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                Real-time Transliteration
              </h4>
              <p className="text-sm text-muted-foreground">
                Type in Latin letters and see instant conversion to native script (e.g., "namaste" → "नमस्ते")
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                Auto Language Detection
              </h4>
              <p className="text-sm text-muted-foreground">
                Automatically detects the language from text script (Devanagari, Arabic, Han, etc.)
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                Conditional Translation
              </h4>
              <p className="text-sm text-muted-foreground">
                Only translates when sender and receiver languages differ - saves resources
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                200+ Languages
              </h4>
              <p className="text-sm text-muted-foreground">
                Supports all world languages via NLLB-200 model with native script rendering
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat interface */}
      {showChat && (
        <DLTranslateChatRoom
          chatId={demoChatId}
          currentUserId={demoUserId}
          currentUserLanguage={userLanguage}
          currentUserName="You"
          partnerUserId={demoPartnerId}
          partnerLanguage={partnerLanguage}
          partnerName="Demo Partner"
          onClose={() => setShowChat(false)}
          className="h-[500px]"
        />
      )}

      {/* Language showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Scripts</CardTitle>
          <CardDescription>
            Examples of languages and their native scripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'hindi', native: 'हिंदी' },
              { name: 'arabic', native: 'العربية' },
              { name: 'chinese', native: '中文' },
              { name: 'japanese', native: '日本語' },
              { name: 'korean', native: '한국어' },
              { name: 'thai', native: 'ไทย' },
              { name: 'russian', native: 'Русский' },
              { name: 'greek', native: 'Ελληνικά' },
              { name: 'hebrew', native: 'עברית' },
              { name: 'tamil', native: 'தமிழ்' },
              { name: 'telugu', native: 'తెలుగు' },
              { name: 'bengali', native: 'বাংলা' },
              { name: 'gujarati', native: 'ગુજરાતી' },
              { name: 'punjabi', native: 'ਪੰਜਾਬੀ' },
              { name: 'amharic', native: 'አማርኛ' },
              { name: 'georgian', native: 'ქართული' },
            ].map(lang => (
              <Badge
                key={lang.name}
                variant="secondary"
                className="text-sm py-1 px-3 cursor-pointer hover:bg-primary/20"
                onClick={() => setPartnerLanguage(lang.name)}
              >
                {lang.native}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
