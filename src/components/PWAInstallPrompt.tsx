/**
 * PWAInstallPrompt.tsx
 * 
 * PURPOSE: Display install prompts and update notifications for the PWA
 */

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, RefreshCw, Bell, Wifi, WifiOff, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PWAInstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isOffline,
    needsUpdate,
    isIOS,
    isPushSupported,
    isPushEnabled,
    install,
    update,
    requestPushPermission,
  } = usePWA();

  const { toast } = useToast();
  const [showInstallCard, setShowInstallCard] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed before
  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  // Show install prompt after a delay
  useEffect(() => {
    if ((isInstallable || (isIOS && !isInstalled)) && !dismissed) {
      const timer = setTimeout(() => {
        setShowInstallCard(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isIOS, isInstalled, dismissed]);

  // Show offline toast
  useEffect(() => {
    if (isOffline) {
      toast({
        title: 'You are offline',
        description: 'Some features may be limited',
        duration: 3000,
      });
    }
  }, [isOffline, toast]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    const success = await install();
    if (success) {
      toast({
        title: 'App installed!',
        description: 'Meow Meow has been added to your home screen',
      });
      setShowInstallCard(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallCard(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleUpdate = async () => {
    await update();
    toast({
      title: 'App updated!',
      description: 'Meow Meow has been updated to the latest version',
    });
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPushPermission();
    if (granted) {
      toast({
        title: 'Notifications enabled!',
        description: 'You will now receive push notifications',
      });
    } else {
      toast({
        title: 'Notifications blocked',
        description: 'Please enable notifications in your browser settings',
        variant: 'destructive',
      });
    }
  };

  // Update available banner
  if (needsUpdate) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <Card className="border-primary bg-background/95 backdrop-blur">
          <CardContent className="flex items-center gap-3 p-4">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium">Update available</p>
              <p className="text-xs text-muted-foreground">Restart to get the latest features</p>
            </div>
            <Button size="sm" onClick={handleUpdate}>
              Update
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // iOS installation instructions
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => setShowIOSInstructions(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Install on iOS
            </CardTitle>
            <CardDescription>
              Add Meow Meow to your home screen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </div>
                <p className="text-sm">
                  Tap the <strong>Share</strong> button in Safari's toolbar
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </div>
                <p className="text-sm">
                  Scroll down and tap <strong>"Add to Home Screen"</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  3
                </div>
                <p className="text-sm">
                  Tap <strong>"Add"</strong> to install the app
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={() => setShowIOSInstructions(false)}>
              Got it!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Install prompt card
  if (showInstallCard && !isInstalled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <Card className="border-primary/20 bg-background/95 backdrop-blur">
          <CardHeader className="relative pb-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">Install Meow Meow</CardTitle>
            <CardDescription>
              Get the full app experience on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                Quick access from home screen
              </li>
              <li className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-primary" />
                Works offline
              </li>
              {isPushSupported && (
                <li className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Push notifications
                </li>
              )}
            </ul>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleInstall}>
                <Download className="mr-2 h-4 w-4" />
                Install
              </Button>
              <Button variant="outline" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Notification prompt for installed app
  if (isInstalled && isPushSupported && !isPushEnabled && !dismissed) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <Card className="border-primary/20 bg-background/95 backdrop-blur">
          <CardContent className="flex items-center gap-3 p-4">
            <Bell className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Enable notifications</p>
              <p className="text-xs text-muted-foreground">Get notified about new messages</p>
            </div>
            <Button size="sm" onClick={handleEnableNotifications}>
              Enable
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Offline indicator
  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground">
        <div className="flex items-center justify-center gap-2 py-1 text-xs">
          <WifiOff className="h-3 w-3" />
          <span>You are offline</span>
        </div>
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
      <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium">
        <WifiOff className="h-3 w-3" />
        <span>You are offline - Some features may be limited</span>
      </div>
    </div>
  );
}
