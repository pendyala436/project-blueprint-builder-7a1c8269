/**
 * Multilingual Chat Page
 * 
 * Browser-based multilingual chat with:
 * - Phonetic typing (Latin → Native script)
 * - Live preview while typing
 * - Background translation (DL-Translate)
 * - Sender sees native script
 * - Receiver sees their language
 * - 200+ language support
 */

import { MultilingualChatDemo } from '@/components/MultilingualChatDemo';
import { MobileLayout } from '@/components/MobileLayout';
import ScreenLayout from '@/components/ScreenLayout';

export default function MultilingualChatPage() {
  return (
    <MobileLayout>
      <ScreenLayout>
        <div className="min-h-screen bg-background py-4 px-2">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                DL-Translate Multilingual Chat
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Type in English letters based on your mother tongue. 
                Messages are automatically converted and translated.
              </p>
            </div>
            
            <MultilingualChatDemo />
            
            <div className="text-center text-xs text-muted-foreground space-y-1 pb-4">
              <p>✅ Exact phonetic transliteration for 45+ Indian & world languages</p>
              <p>✅ DL-Translate translation for 200+ languages (browser-based)</p>
              <p>✅ No partial messages • Complete send only</p>
            </div>
          </div>
        </div>
      </ScreenLayout>
    </MobileLayout>
  );
}
