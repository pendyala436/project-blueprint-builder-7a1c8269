/**
 * PWAInstallPrompt.tsx
 * 
 * PURPOSE: Auto-display install prompts based on OS detection for PWA installation
 * Supports: Windows, macOS, Linux, iOS, Android, ChromeOS
 */

import { useState, useEffect, useCallback } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, RefreshCw, Bell, WifiOff, Smartphone, Monitor, Apple } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PWAInstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isOffline,
    needsUpdate,
    isIOS,
    isIPadOS,
    isAndroid,
    isMacOS,
    isWindows,
    isLinux,
    isChromeOS,
    isChrome,
    isEdge,
    isSafari,
    isFirefox,
    isPushSupported,
    isPushEnabled,
    install,
    update,
    requestPushPermission,
  } = usePWA();

  const { toast } = useToast();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Get browser name for instructions
  const browserName = isChrome ? 'Chrome' : isEdge ? 'Edge' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : 'your browser';

  // Get OS-specific installation info
  const getOSInfo = useCallback(() => {
    if (isIOS || isIPadOS) {
      return {
        title: isIPadOS ? "Install on iPad" : "Install on iPhone",
        icon: <Apple className="h-5 w-5" />,
        emoji: "🍎",
        steps: [
          "Tap the Share button (□↑) in Safari",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' to confirm"
        ],
        note: "Use Safari browser for best experience",
        canAutoInstall: false
      };
    }
    if (isAndroid) {
      return {
        title: "Install on Android",
        icon: <Smartphone className="h-5 w-5" />,
        emoji: "🤖",
        steps: [
          "Tap the menu (⋮) button",
          "Tap 'Install app' or 'Add to Home screen'",
          "Tap 'Install' to confirm"
        ],
        note: "Works best in Chrome or Samsung Internet",
        canAutoInstall: isInstallable
      };
    }
    if (isWindows) {
      return {
        title: "Install on Windows",
        icon: <Monitor className="h-5 w-5" />,
        emoji: "🪟",
        steps: [
          `Click the install icon (⊕) in ${browserName}'s address bar`,
          "Or click menu (⋯) → 'Install Meow Meow...'",
          "Click 'Install' to add to Start menu"
        ],
        note: "Works in Chrome, Edge, or Brave",
        canAutoInstall: isInstallable
      };
    }
    if (isMacOS) {
      return {
        title: "Install on Mac",
        icon: <Apple className="h-5 w-5" />,
        emoji: "🍏",
        steps: isSafari ? [
          "Click File in the menu bar",
          "Click 'Add to Dock'",
          "The app will appear in your Dock"
        ] : [
          `Click the install icon in ${browserName}'s address bar`,
          "Or use menu → 'Install Meow Meow...'",
          "The app will appear in Applications"
        ],
        note: isSafari ? "Safari 17+ supports PWA" : "Works in Chrome or Edge",
        canAutoInstall: isInstallable
      };
    }
    if (isLinux) {
      return {
        title: "Install on Linux",
        icon: <Monitor className="h-5 w-5" />,
        emoji: "🐧",
        steps: [
          `Click the install icon in ${browserName}'s address bar`,
          "Or click menu → 'Install app'",
          "The app will be added to applications"
        ],
        note: "Works in Chrome, Chromium, or Edge",
        canAutoInstall: isInstallable
      };
    }
    if (isChromeOS) {
      return {
        title: "Install on Chromebook",
        icon: <Monitor className="h-5 w-5" />,
        emoji: "💻",
        steps: [
          "Click the install icon in the address bar",
          "Click 'Install'",
          "Find the app in your launcher"
        ],
        note: "Full PWA support on Chrome OS",
        canAutoInstall: isInstallable
      };
    }
    return {
      title: "Install App",
      icon: <Download className="h-5 w-5" />,
      emoji: "📱",
      steps: [
        "Open in Chrome, Edge, or Safari",
        "Look for install icon in address bar",
        "Click 'Install' to add to device"
      ],
      note: "Supported on most modern browsers",
      canAutoInstall: isInstallable
    };
  }, [isIOS, isIPadOS, isAndroid, isWindows, isMacOS, isLinux, isChromeOS, isInstallable, isSafari, browserName]);

  // Check if dismissed before
  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
    
    // Reset dismissed state after 7 days
    if (wasDismissed && dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed > 7) {
        localStorage.removeItem('pwa-install-dismissed');
        localStorage.removeItem('pwa-install-dismissed-time');
      } else {
        setDismissed(true);
      }
    }
  }, []);

  // Auto-show install prompt after delay
  useEffect(() => {
    if (isInstalled || dismissed) return;
    
    // Show prompt after 3 seconds for all platforms
    const timer = setTimeout(() => {
      setShowInstallPrompt(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [isInstalled, dismissed]);

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
    const osInfo = getOSInfo();
    
    if (osInfo.canAutoInstall && isInstallable) {
      try {
        const success = await install();
        if (success) {
          toast({
            title: 'App installed!',
            description: 'Meow Meow has been added to your device',
          });
          setShowInstallPrompt(false);
          return;
        }
      } catch (error) {
        console.error('Auto-install failed:', error);
      }
    }
    
    // For iOS or if auto-install fails, the instructions are already visible
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
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
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-slide-up">
        <Card className="border-primary bg-background/95 backdrop-blur shadow-lg">
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

  // Main install prompt with OS-specific instructions
  if (showInstallPrompt && !isInstalled) {
    const osInfo = getOSInfo();
    
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-[400px] animate-slide-up">
        <Card className="border-primary/30 bg-background/95 backdrop-blur shadow-xl">
          <CardHeader className="relative pb-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{osInfo.emoji}</span>
              <div>
                <CardTitle className="text-lg">{osInfo.title}</CardTitle>
                <CardDescription>Get the full app experience</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Benefits */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3 text-primary" />
                <span>Quick access</span>
              </div>
              <div className="flex items-center gap-1">
                <WifiOff className="h-3 w-3 text-primary" />
                <span>Works offline</span>
              </div>
              {isPushSupported && (
                <div className="flex items-center gap-1">
                  <Bell className="h-3 w-3 text-primary" />
                  <span>Notifications</span>
                </div>
              )}
            </div>

            {/* Installation Steps */}
            <div className="space-y-2 bg-muted/30 rounded-lg p-3">
              <p className="text-xs font-medium text-foreground">How to install:</p>
              <ol className="space-y-1.5 text-sm text-muted-foreground">
                {osInfo.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {osInfo.note && (
                <p className="text-xs text-muted-foreground/70 mt-2">
                  💡 {osInfo.note}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {osInfo.canAutoInstall && (
                <Button className="flex-1" onClick={handleInstall}>
                  <Download className="mr-2 h-4 w-4" />
                  Install Now
                </Button>
              )}
              <Button 
                variant={osInfo.canAutoInstall ? "outline" : "default"} 
                className={osInfo.canAutoInstall ? "" : "flex-1"}
                onClick={handleDismiss}
              >
                {osInfo.canAutoInstall ? "Later" : "Got it"}
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
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-slide-up">
        <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-lg">
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950">
        <div className="flex items-center justify-center gap-2 py-1.5 text-xs font-medium">
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
      <div className="flex items-center justify-center gap-2 py-1.5 text-xs font-medium">
        <WifiOff className="h-3 w-3" />
        <span>You are offline - Some features may be limited</span>
      </div>
    </div>
  );
}
