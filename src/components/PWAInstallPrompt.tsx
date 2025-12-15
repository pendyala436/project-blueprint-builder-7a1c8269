/**
 * PWAInstallPrompt.tsx
 * 
 * PURPOSE: Auto-trigger native browser install prompt for PWA installation
 * No UI - relies on native browser install prompt
 */

import { useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { WifiOff } from 'lucide-react';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, install } = usePWA();

  // Auto-trigger native install prompt when available
  useEffect(() => {
    if (isInstallable && !isInstalled) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        install();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, install]);

  // No UI - installation is handled natively by the browser
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
