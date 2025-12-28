/**
 * Multilingual Chat Demo Page
 * 
 * Demonstrates the DL-Translate chat system with:
 * - Real-time transliteration
 * - Auto language detection
 * - Conditional translation
 * - 200+ language support
 */

import React, { useState, useEffect } from 'react';
import { DLTranslateChat } from '@/components/chat/DLTranslateChat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Languages, Sparkles, ArrowRight } from 'lucide-react';
import { getSupportedLanguages, getNativeName } from '@/lib/dl-translate';

const MultilingualChatDemo: React.FC = () => {
  const [userLanguage, setUserLanguage] = useState('telugu');
  const [partnerLanguage, setPartnerLanguage] = useState('hindi');
  const languages = getSupportedLanguages();

  // Set document title
  useEffect(() => {
    document.title = 'Multilingual Chat | 200+ Language Support';
  }, []);

  return (
    <>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Languages className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">DL-Translate Powered</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold">
              Multilingual Chat
            </h1>
            
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Type in Latin letters and watch real-time transliteration to your native script.
              Messages are automatically translated between different languages.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Globe className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">200+ Languages</h3>
                    <p className="text-sm text-muted-foreground">Full world coverage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Real-time</h3>
                    <p className="text-sm text-muted-foreground">Instant transliteration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Languages className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Auto Translation</h3>
                    <p className="text-sm text-muted-foreground">When languages differ</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Language Selection */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Demo Configuration</CardTitle>
              <CardDescription>
                Select languages to simulate a conversation between two users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">You speak:</span>
                  <Select value={userLanguage} onValueChange={setUserLanguage}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.slice(0, 50).map((lang) => (
                        <SelectItem key={lang.code} value={lang.name}>
                          {lang.native} ({lang.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Partner speaks:</span>
                  <Select value={partnerLanguage} onValueChange={setPartnerLanguage}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.slice(0, 50).map((lang) => (
                        <SelectItem key={lang.code} value={lang.name}>
                          {lang.native} ({lang.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Badge variant="outline" className="ml-auto">
                  {userLanguage === partnerLanguage 
                    ? 'Same language - no translation' 
                    : `Will translate: ${getNativeName(userLanguage)} → ${getNativeName(partnerLanguage)}`
                  }
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Chat Component */}
          <DLTranslateChat
            currentUserId="demo-user-1"
            partnerId="demo-user-2"
            userLanguage={userLanguage}
            partnerLanguage={partnerLanguage}
          />

          {/* Example Inputs */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Try These Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium text-muted-foreground mb-1">Telugu (type in Latin):</p>
                  <p className="font-mono">bagunnava → బాగున్నావా</p>
                  <p className="font-mono">namaste → నమస్తే</p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium text-muted-foreground mb-1">Hindi (type in Latin):</p>
                  <p className="font-mono">aap kaise hain → आप कैसे हैं</p>
                  <p className="font-mono">dhanyavaad → धन्यवाद</p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium text-muted-foreground mb-1">Tamil (type in Latin):</p>
                  <p className="font-mono">vanakkam → வணக்கம்</p>
                  <p className="font-mono">nandri → நன்றி</p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium text-muted-foreground mb-1">Arabic (type in Latin):</p>
                  <p className="font-mono">marhaba → مرحبا</p>
                  <p className="font-mono">shukran → شكرا</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default MultilingualChatDemo;
