/**
 * usePWA.ts
 * 
 * PURPOSE: Universal PWA support for ALL devices, OS, and browsers
 * Supports: iOS Safari, Android Chrome, Windows Edge, macOS Safari, Linux Firefox, Samsung Internet, etc.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  // Installation
  isInstallable: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  installMethod: 'prompt' | 'manual-ios' | 'manual-android' | 'none';
  
  // Updates
  needsUpdate: boolean;
  
  // Connectivity
  isOffline: boolean;
  connectionType: string;
  isSlowConnection: boolean;
  
  // Platform Detection
  isIOS: boolean;
  isIPadOS: boolean;
  isAndroid: boolean;
  isMacOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isChromeOS: boolean;
  
  // Browser Detection
  isChrome: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isSamsungInternet: boolean;
  isOpera: boolean;
  isBrave: boolean;
  isUCBrowser: boolean;
  
  // Push Notifications
  isPushSupported: boolean;
  isPushEnabled: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  
  // Features Support
  isBackgroundSyncSupported: boolean;
  isPeriodicSyncSupported: boolean;
  isShareTargetSupported: boolean;
  isBadgingSupported: boolean;
  isWakeLockSupported: boolean;
  isFileSystemSupported: boolean;
  
  // Storage
  storageQuota: number;
  storageUsed: number;
  isPersistentStorageGranted: boolean;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    canInstall: false,
    installMethod: 'none',
    needsUpdate: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    connectionType: 'unknown',
    isSlowConnection: false,
    isIOS: false,
    isIPadOS: false,
    isAndroid: false,
    isMacOS: false,
    isWindows: false,
    isLinux: false,
    isChromeOS: false,
    isChrome: false,
    isSafari: false,
    isFirefox: false,
    isEdge: false,
    isSamsungInternet: false,
    isOpera: false,
    isBrave: false,
    isUCBrowser: false,
    isPushSupported: false,
    isPushEnabled: false,
    pushPermission: 'unsupported',
    isBackgroundSyncSupported: false,
    isPeriodicSyncSupported: false,
    isShareTargetSupported: false,
    isBadgingSupported: false,
    isWakeLockSupported: false,
    isFileSystemSupported: false,
    storageQuota: 0,
    storageUsed: 0,
    isPersistentStorageGranted: false,
  });

  // Track mount state to prevent state updates before mount
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Register service worker with auto-update
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('Service Worker registered:', registration);
      // Note: checkPushPermission and checkStorageInfo are called in useEffect after mount
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
  });

  // Comprehensive platform and browser detection
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';

    // OS Detection
    const isIOS = /iphone|ipod/.test(ua);
    const isIPadOS = /ipad/.test(ua) || (platform === 'macintel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    const isMacOS = /mac/.test(platform) && !isIOS && !isIPadOS;
    const isWindows = /win/.test(platform) || /windows/.test(ua);
    const isLinux = /linux/.test(platform) && !isAndroid;
    const isChromeOS = /cros/.test(ua);

    // Browser Detection
    const isChrome = /chrome/.test(ua) && !/edge|edg|opr|opera|brave/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|chromium|crios/.test(ua);
    const isFirefox = /firefox|fxios/.test(ua);
    const isEdge = /edge|edg/.test(ua);
    const isSamsungInternet = /samsungbrowser/.test(ua);
    const isOpera = /opr|opera/.test(ua);
    const isBrave = /brave/.test(ua) || !!(navigator as any).brave;
    const isUCBrowser = /ucbrowser|ucweb/.test(ua);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    // Determine install method based on platform/browser
    let installMethod: PWAState['installMethod'] = 'none';
    if (!isStandalone) {
      if (isIOS || isIPadOS) {
        installMethod = 'manual-ios'; // iOS requires Add to Home Screen
      } else if (isAndroid && !isSamsungInternet && !isChrome) {
        installMethod = 'manual-android'; // Some Android browsers need manual install
      } else {
        installMethod = 'prompt'; // Chrome, Edge, Samsung Internet support install prompt
      }
    }

    // Feature Detection
    const isPushSupported = 'PushManager' in window && 'serviceWorker' in navigator;
    const isBackgroundSyncSupported = 'SyncManager' in window;
    const isPeriodicSyncSupported = 'PeriodicSyncManager' in (navigator as any);
    const isShareTargetSupported = 'share' in navigator;
    const isBadgingSupported = 'setAppBadge' in navigator;
    const isWakeLockSupported = 'wakeLock' in navigator;
    const isFileSystemSupported = 'showOpenFilePicker' in window;

    // Connection info
    const connection = (navigator as any).connection;
    const connectionType = connection?.effectiveType || 'unknown';
    const isSlowConnection = connectionType === '2g' || connectionType === 'slow-2g';

    setState(prev => ({
      ...prev,
      isIOS,
      isIPadOS,
      isAndroid,
      isMacOS,
      isWindows,
      isLinux,
      isChromeOS,
      isChrome,
      isSafari,
      isFirefox,
      isEdge,
      isSamsungInternet,
      isOpera,
      isBrave,
      isUCBrowser,
      isInstalled: isStandalone,
      installMethod,
      canInstall: !isStandalone && installMethod !== 'none',
      isPushSupported,
      pushPermission: 'Notification' in window ? Notification.permission : 'unsupported',
      isBackgroundSyncSupported,
      isPeriodicSyncSupported,
      isShareTargetSupported,
      isBadgingSupported,
      isWakeLockSupported,
      isFileSystemSupported,
      connectionType,
      isSlowConnection,
    }));
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      const handleConnectionChange = () => {
        setState(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
          isSlowConnection: connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g',
        }));
      };
      connection.addEventListener('change', handleConnectionChange);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle install prompt (Chrome, Edge, Samsung Internet, Opera)
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({ ...prev, isInstallable: true, canInstall: true }));
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setState(prev => ({ 
        ...prev, 
        isInstallable: false, 
        isInstalled: true,
        canInstall: false,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Update needsUpdate state
  useEffect(() => {
    setState(prev => ({ ...prev, needsUpdate: needRefresh }));
  }, [needRefresh]);

  // Check push notification permission (safe version that checks mount state)
  const checkPushPermissionSafe = useCallback(() => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setState(prev => ({ 
        ...prev, 
        isPushEnabled: permission === 'granted',
        pushPermission: permission,
      }));
    }
  }, []);

  // Check storage info (safe version that checks mount state)
  const checkStorageInfoSafe = useCallback(async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const isPersisted = await navigator.storage.persisted?.() || false;
        setState(prev => ({
          ...prev,
          storageQuota: estimate.quota || 0,
          storageUsed: estimate.usage || 0,
          isPersistentStorageGranted: isPersisted,
        }));
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
  }, []);

  // Initialize push permission and storage info after mount
  useEffect(() => {
    if (isMounted) {
      checkPushPermissionSafe();
      checkStorageInfoSafe();
    }
  }, [isMounted, checkPushPermissionSafe, checkStorageInfoSafe]);

  // Check push notification permission
  const checkPushPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setState(prev => ({ 
        ...prev, 
        isPushEnabled: permission === 'granted',
        pushPermission: permission,
      }));
    }
  }, []);

  // Check storage info
  const checkStorageInfo = useCallback(async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const isPersisted = await navigator.storage.persisted?.() || false;
        setState(prev => ({
          ...prev,
          storageQuota: estimate.quota || 0,
          storageUsed: estimate.usage || 0,
          isPersistentStorageGranted: isPersisted,
        }));
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
  }, []);

  // Install PWA (for browsers that support install prompt)
  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      console.log('Install prompt not available');
      return false;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setState(prev => ({ 
          ...prev, 
          isInstallable: false, 
          isInstalled: true,
          canInstall: false,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [installPrompt]);

  // Get install instructions for manual installation (iOS, some Android browsers)
  const getInstallInstructions = useCallback(() => {
    if (state.isIOS || state.isIPadOS) {
      return {
        title: 'Install on iOS',
        steps: [
          'Tap the Share button (square with arrow)',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" in the top right corner',
        ],
        icon: 'share',
      };
    }
    if (state.isAndroid) {
      if (state.isFirefox) {
        return {
          title: 'Install on Android (Firefox)',
          steps: [
            'Tap the menu button (three dots)',
            'Tap "Install"',
            'Follow the prompts to install',
          ],
          icon: 'menu',
        };
      }
      return {
        title: 'Install on Android',
        steps: [
          'Tap the menu button (three dots)',
          'Tap "Add to Home Screen" or "Install App"',
          'Follow the prompts to install',
        ],
        icon: 'menu',
      };
    }
    if (state.isMacOS && state.isSafari) {
      return {
        title: 'Install on macOS Safari',
        steps: [
          'Click File in the menu bar',
          'Click "Add to Dock"',
          'The app will be added to your Dock',
        ],
        icon: 'file',
      };
    }
    return {
      title: 'Install App',
      steps: [
        'Look for an install icon in your browser\'s address bar',
        'Or check the browser menu for "Install" option',
      ],
      icon: 'download',
    };
  }, [state.isIOS, state.isIPadOS, state.isAndroid, state.isMacOS, state.isSafari, state.isFirefox]);

  // Update service worker
  const update = useCallback(async () => {
    await updateServiceWorker(true);
    setNeedRefresh(false);
  }, [updateServiceWorker, setNeedRefresh]);

  // Request push notification permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setState(prev => ({ 
        ...prev, 
        isPushEnabled: granted,
        pushPermission: permission,
      }));
      
      if (granted) {
        await subscribeToPush();
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request push permission:', error);
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('Push subscription ready:', registration);
      // Note: You would need to set VAPID public key for production
      return null;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      return null;
    }
  }, []);

  // Show local notification
  const showNotification = useCallback(async (title: string, options?: NotificationOptions): Promise<boolean> => {
    if (!state.isPushEnabled) {
      console.warn('Push notifications not enabled');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options,
      });
      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }, [state.isPushEnabled]);

  // Set app badge (supported in Chrome, Edge, Safari 17+)
  const setBadge = useCallback(async (count: number): Promise<boolean> => {
    if (!state.isBadgingSupported) return false;
    
    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
      return true;
    } catch (error) {
      console.error('Failed to set badge:', error);
      return false;
    }
  }, [state.isBadgingSupported]);

  // Clear all caches
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'CLEAR_CACHE' });
      await checkStorageInfo();
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }, [checkStorageInfo]);

  // Request persistent storage
  const requestPersistentStorage = useCallback(async (): Promise<boolean> => {
    if (!('storage' in navigator && 'persist' in navigator.storage)) {
      return false;
    }
    
    try {
      const granted = await navigator.storage.persist();
      setState(prev => ({ ...prev, isPersistentStorageGranted: granted }));
      return granted;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }, []);

  // Share content (Web Share API)
  const share = useCallback(async (data: ShareData): Promise<boolean> => {
    if (!state.isShareTargetSupported || !navigator.share) {
      console.warn('Web Share API not supported');
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to share:', error);
      }
      return false;
    }
  }, [state.isShareTargetSupported]);

  // Browser support info
  const browserSupport = useMemo(() => ({
    installPrompt: state.isChrome || state.isEdge || state.isSamsungInternet || state.isOpera,
    pushNotifications: state.isPushSupported,
    backgroundSync: state.isBackgroundSyncSupported,
    periodicSync: state.isPeriodicSyncSupported,
    appBadge: state.isBadgingSupported,
    webShare: state.isShareTargetSupported,
    persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
    offlineSupport: 'serviceWorker' in navigator,
  }), [state]);

  return {
    ...state,
    browserSupport,
    install,
    getInstallInstructions,
    update,
    requestPushPermission,
    showNotification,
    setBadge,
    clearCache,
    requestPersistentStorage,
    share,
  };
}