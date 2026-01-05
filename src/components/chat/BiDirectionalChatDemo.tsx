/**
 * Bi-Directional Chat Translation Demo
 * 
 * Demonstrates the full translation flow:
 * - Two users with different languages
 * - Both type in Latin letters
 * - Both see live preview in their native script
 * - On send: sender sees native text
 * - On receive: receiver sees translated native text
 */

import { useState, useCallback } from 'react';
import { ProductionChatTranslation, type ChatMessage } from './ProductionChatTranslation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Languages, ArrowLeftRight, RefreshCw } from 'lucide-react';

// Available languages for demo
const DEMO_LANGUAGES = [
  { code: 'hindi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'telugu', name: 'Telugu', native: 'తెలుగు' },
  { code: 'tamil', name: 'Tamil', native: 'தமிழ்' },
  { code: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'malayalam', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'bengali', name: 'Bengali', native: 'বাংলা' },
  { code: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'marathi', name: 'Marathi', native: 'मराठी' },
  { code: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'urdu', name: 'Urdu', native: 'اردو' },
  { code: 'english', name: 'English', native: 'English' },
  { code: 'spanish', name: 'Spanish', native: 'Español' },
  { code: 'french', name: 'French', native: 'Français' },
  { code: 'arabic', name: 'Arabic', native: 'العربية' },
  { code: 'russian', name: 'Russian', native: 'Русский' },
  { code: 'chinese', name: 'Chinese', native: '中文' },
  { code: 'japanese', name: 'Japanese', native: '日本語' },
  { code: 'korean', name: 'Korean', native: '한국어' },
];

export function BiDirectionalChatDemo() {
  // User configurations
  const [user1Lang, setUser1Lang] = useState('hindi');
  const [user2Lang, setUser2Lang] = useState('telugu');
  const [showDebug, setShowDebug] = useState(false);

  // Messages for each side (simulating real-time sync)
  const [user1Messages, setUser1Messages] = useState<ChatMessage[]>([]);
  const [user2Messages, setUser2Messages] = useState<ChatMessage[]>([]);

  // User objects
  const user1 = { id: 'User 1', language: user1Lang };
  const user2 = { id: 'User 2', language: user2Lang };

  // Handle User 1 sending message
  const handleUser1Send = useCallback((message: ChatMessage) => {
    // Add to User 1's view
    setUser1Messages(prev => [...prev, message]);
    
    // Add to User 2's view (they see receiverNativeText)
    setUser2Messages(prev => [...prev, message]);
  }, []);

  // Handle User 2 sending message
  const handleUser2Send = useCallback((message: ChatMessage) => {
    // Add to User 2's view
    setUser2Messages(prev => [...prev, message]);
    
    // Add to User 1's view
    setUser1Messages(prev => [...prev, message]);
  }, []);

  // Swap languages
  const swapLanguages = useCallback(() => {
    const temp = user1Lang;
    setUser1Lang(user2Lang);
    setUser2Lang(temp);
  }, [user1Lang, user2Lang]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setUser1Messages([]);
    setUser2Messages([]);
  }, []);

  const isSameLanguage = user1Lang === user2Lang;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Languages className="h-6 w-6 text-primary" />
          Real-time Bi-Directional Chat Translation
        </h1>
        <p className="text-muted-foreground">
          Type in Latin letters → See live preview → Send in native script → Receive translated
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Configuration</CardTitle>
          <CardDescription>Select languages for each user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* User 1 Language */}
            <div className="space-y-2">
              <Label>User 1 Language</Label>
              <Select value={user1Lang} onValueChange={setUser1Lang}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.native})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap Button */}
            <Button variant="outline" size="icon" onClick={swapLanguages}>
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            {/* User 2 Language */}
            <div className="space-y-2">
              <Label>User 2 Language</Label>
              <Select value={user2Lang} onValueChange={setUser2Lang}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.native})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Translation Status */}
            <div className="flex-1 flex items-center justify-center gap-2">
              {isSameLanguage ? (
                <Badge variant="secondary">Same language - No translation needed</Badge>
              ) : (
                <Badge variant="default" className="gap-1">
                  <Languages className="h-3 w-3" />
                  Auto-translation active
                </Badge>
              )}
            </div>

            {/* Debug Toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={showDebug} onCheckedChange={setShowDebug} />
              <Label className="text-sm">Debug</Label>
            </div>

            {/* Clear Button */}
            <Button variant="ghost" size="sm" onClick={clearMessages} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Windows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User 1 Chat Window */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-semibold">User 1</p>
              <p className="text-xs text-muted-foreground">
                Mother tongue: {DEMO_LANGUAGES.find(l => l.code === user1Lang)?.native}
              </p>
            </div>
          </div>
          <ProductionChatTranslation
            currentUser={user1}
            partner={user2}
            messages={user1Messages}
            onSendMessage={handleUser1Send}
            showDebugInfo={showDebug}
            className="h-[500px]"
          />
        </div>

        {/* User 2 Chat Window */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-semibold">User 2</p>
              <p className="text-xs text-muted-foreground">
                Mother tongue: {DEMO_LANGUAGES.find(l => l.code === user2Lang)?.native}
              </p>
            </div>
          </div>
          <ProductionChatTranslation
            currentUser={user2}
            partner={user1}
            messages={user2Messages}
            onSendMessage={handleUser2Send}
            showDebugInfo={showDebug}
            className="h-[500px]"
          />
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>1. Typing:</strong> Type in Latin letters (Romanized). Example: "namaste" for Hindi.</p>
          <p><strong>2. Live Preview:</strong> See real-time transliteration to your native script as you type.</p>
          <p><strong>3. Send:</strong> On send, you see the message in your native script immediately.</p>
          <p><strong>4. Receive:</strong> The other person sees it translated into their native language.</p>
          <p><strong>5. Same Language:</strong> If both users speak the same language, no translation occurs - both see native script.</p>
          <p><strong>6. Non-blocking:</strong> All translation happens in background, typing is never affected.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default BiDirectionalChatDemo;
