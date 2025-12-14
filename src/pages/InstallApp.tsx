/**
 * InstallApp.tsx
 * 
 * PURPOSE: Dedicated page for installing the PWA with instructions for all platforms
 */

import { usePWA } from '@/hooks/usePWA';
import { useNativeApp } from '@/hooks/useNativeApp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  Chrome, 
  CheckCircle2,
  ArrowLeft,
  Bell,
  WifiOff,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, MobileContent, MobileHeader } from '@/components/MobileLayout';

export default function InstallApp() {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, isAndroid, install, isPushSupported, requestPushPermission } = usePWA();
  const { isNative } = useNativeApp();

  const handleInstall = async () => {
    await install();
  };

  // If running as native app, show different content
  if (isNative) {
    return (
      <MobileLayout>
        <MobileHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">App Info</h1>
          </div>
        </MobileHeader>
        <MobileContent className="p-4">
          <Card className="border-green-500/20 bg-green-500/10">
            <CardContent className="flex items-center gap-4 p-6">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <h2 className="text-xl font-bold">Native App</h2>
                <p className="text-muted-foreground">
                  You're using the native app with full device features
                </p>
              </div>
            </CardContent>
          </Card>
        </MobileContent>
      </MobileLayout>
    );
  }

  // If already installed as PWA
  if (isInstalled) {
    return (
      <MobileLayout>
        <MobileHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">App Installed</h1>
          </div>
        </MobileHeader>
        <MobileContent className="p-4 space-y-4">
          <Card className="border-green-500/20 bg-green-500/10">
            <CardContent className="flex items-center gap-4 p-6">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <h2 className="text-xl font-bold">App Installed!</h2>
                <p className="text-muted-foreground">
                  Meow Meow is installed on your device
                </p>
              </div>
            </CardContent>
          </Card>

          {isPushSupported && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Enable Notifications
                </CardTitle>
                <CardDescription>
                  Get notified about new messages and matches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={requestPushPermission} className="w-full">
                  Enable Push Notifications
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>App Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <WifiOff className="h-5 w-5 text-primary" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <span>Fast and responsive</span>
              </div>
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-primary" />
                <span>No app store required</span>
              </div>
            </CardContent>
          </Card>
        </MobileContent>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <MobileHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Install App</h1>
        </div>
      </MobileHeader>
      <MobileContent className="p-4 space-y-4">
        {/* Hero Section */}
        <div className="text-center py-6">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Install Meow Meow</h1>
          <p className="text-muted-foreground">
            Get the full app experience on your device
          </p>
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Why Install?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Quick Access</p>
                <p className="text-sm text-muted-foreground">Launch from your home screen</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Works Offline</p>
                <p className="text-sm text-muted-foreground">Access the app without internet</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Never miss a message</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Fast & Smooth</p>
                <p className="text-sm text-muted-foreground">Native-like performance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install Button for Android/Desktop */}
        {isInstallable && !isIOS && (
          <Button size="lg" className="w-full" onClick={handleInstall}>
            <Download className="mr-2 h-5 w-5" />
            Install Now
          </Button>
        )}

        {/* iOS Instructions */}
        {isIOS && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Install on iPhone/iPad
              </CardTitle>
              <CardDescription>
                Follow these steps to add to your home screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Tap the Share button</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Share className="h-4 w-4" />
                    <span>In Safari's toolbar at the bottom</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Scroll down and tap "Add to Home Screen"</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <PlusSquare className="h-4 w-4" />
                    <span>Look for this icon</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    The app will appear on your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Chrome Instructions (fallback) */}
        {isAndroid && !isInstallable && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                Install on Android
              </CardTitle>
              <CardDescription>
                Follow these steps in Chrome
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Tap the menu button</p>
                  <p className="text-sm text-muted-foreground">
                    Three dots in the top right corner
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Tap "Add to Home screen"</p>
                  <p className="text-sm text-muted-foreground">
                    Or "Install app" if available
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Confirm installation</p>
                  <p className="text-sm text-muted-foreground">
                    Tap "Add" or "Install"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </MobileContent>
    </MobileLayout>
  );
}
