/**
 * PWAInstallPrompt.tsx
 * 
 * PURPOSE: Auto-trigger native browser install prompt for PWA installation
 * Shows manual instructions only for iOS Safari (which doesn't support beforeinstallprompt)
 */

import { useEffect, useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { WifiOff, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, install } = usePWA();
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Detect iOS Safari
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
  const isIOSSafari = isIOS && !isInStandaloneMode;

  // Auto-trigger native install prompt when available (Android, Windows, Linux, macOS Chrome/Edge)
  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        install();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, install]);

  // Show iOS manual instructions after delay
  useEffect(() => {
    if (isIOSSafari && !dismissed) {
      const timer = setTimeout(() => {
        setShowIOSPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isIOSSafari, dismissed]);

  // Show iOS Safari manual install prompt
  if (showIOSPrompt && !dismissed) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
        <button 
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="font-semibold text-foreground mb-2">Install This App</p>
        <p className="text-sm text-muted-foreground mb-3">
          Tap <Share className="inline h-4 w-4 mx-1" /> <strong>Share</strong> then select <strong>Add to Home Screen</strong>
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
    );
  }

  return null;
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
