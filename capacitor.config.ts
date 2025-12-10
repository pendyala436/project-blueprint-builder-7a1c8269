import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.83206b95108442d8a3efe71e72b4dab6',
  appName: 'Meow Meow',
  webDir: 'dist',
  server: {
    url: 'https://83206b95-1084-42d8-a3ef-e71e72b4dab6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0d14',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#0a0d14',
    allowMixedContent: true,
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0d14',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0d14',
      showSpinner: false,
    },
  },
};

export default config;
