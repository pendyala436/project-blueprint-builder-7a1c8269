/**
 * Multilingual Chat Page
 * 
 * Browser-based multilingual chat with NLLB-200:
 * - Spell correction on Latin input
 * - Phonetic typing (Latin → Native script)
 * - Live preview while typing
 * - Background translation with NLLB-200
 * - Sender sees native script
 * - Receiver sees their language (200+ languages)
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
                NLLB-200 Multilingual Chat
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Type in English letters based on your mother tongue. 
                Spell correction + transliteration + neural translation.
              </p>
            </div>
            
            <MultilingualChatDemo />
            
            <div className="text-center text-xs text-muted-foreground space-y-1 pb-4">
              <p>✅ Spell correction for common typos</p>
              <p>✅ Phonetic transliteration for 45+ languages</p>
              <p>✅ NLLB-200 neural translation (200+ languages)</p>
              <p>✅ Non-blocking • No partial messages</p>
            </div>
          </div>
        </div>
      </ScreenLayout>
    </MobileLayout>
  );
}
