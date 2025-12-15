/**
 * PWAInstallPrompt.tsx
 * 
 * PURPOSE: Auto-trigger native browser install prompt for PWA installation
 * Shows manual instructions for iOS Safari and fallback for other platforms
 * NOTE: beforeinstallprompt only works on production sites, not in iframes/previews
 */

import { useEffect, useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { WifiOff, Share, X, Download, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, install, isIOS, isIPadOS, isAndroid, isMacOS, isSafari, getInstallInstructions } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [autoPromptTriggered, setAutoPromptTriggered] = useState(false);

  // Check if in standalone mode (already installed)
  const isInStandaloneMode = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  // Log PWA state for debugging
  useEffect(() => {
    console.log('[PWA] State:', { isInstallable, isInstalled, isInStandaloneMode, isIOS, isIPadOS, isAndroid });
  }, [isInstallable, isInstalled, isInStandaloneMode, isIOS, isIPadOS, isAndroid]);

  // Auto-trigger native install prompt when available (Android, Windows, Linux, macOS Chrome/Edge)
  useEffect(() => {
    if (isInstallable && !isInstalled && !autoPromptTriggered) {
      console.log('[PWA] Auto-triggering install prompt...');
      const timer = setTimeout(async () => {
        setAutoPromptTriggered(true);
        const result = await install();
        console.log('[PWA] Install result:', result);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, install, autoPromptTriggered]);

  // Show manual prompt for iOS or when auto-prompt isn't available
  useEffect(() => {
    if (dismissed || isInstalled || isInStandaloneMode) return;

    // Show prompt after delay if:
    // 1. iOS/iPadOS (no auto-prompt support)
    // 2. Auto-prompt not triggered after 4 seconds (fallback for all platforms)
    const timer = setTimeout(() => {
      if (isIOS || isIPadOS) {
        console.log('[PWA] Showing iOS manual install prompt');
        setShowPrompt(true);
      } else if (!isInstallable && !autoPromptTriggered) {
        console.log('[PWA] Showing fallback install prompt (beforeinstallprompt not fired)');
        setShowPrompt(true);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [isIOS, isIPadOS, dismissed, isInstalled, isInStandaloneMode, isInstallable, autoPromptTriggered]);

  // Don't show if already installed or dismissed
  if (isInstalled || isInStandaloneMode || dismissed || !showPrompt) {
    return null;
  }

  const instructions = getInstallInstructions();
  const isIOSDevice = isIOS || isIPadOS;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          {isIOSDevice ? (
            <Share className="h-5 w-5 text-primary" />
          ) : (
            <Download className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground mb-1">Install This App</p>
          <p className="text-sm text-muted-foreground mb-3">
            {isIOSDevice ? (
              <>Tap <Share className="inline h-4 w-4 mx-0.5" /> <strong>Share</strong> then <strong>Add to Home Screen</strong></>
            ) : isAndroid ? (
              <>Tap <MoreVertical className="inline h-4 w-4 mx-0.5" /> <strong>Menu</strong> then <strong>Install App</strong></>
            ) : isMacOS && isSafari ? (
              <>Click <strong>File</strong> → <strong>Add to Dock</strong></>
            ) : (
              <>Look for the install icon in your browser's address bar or menu</>
            )}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDismissed(true)}
            className="w-full"
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950">
      <div className="flex items-center justify-center gap-2 py-1.5 text-xs font-medium">
        <WifiOff className="h-3 w-3" />
        <span>You are offline - Some features may be limited</span>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
