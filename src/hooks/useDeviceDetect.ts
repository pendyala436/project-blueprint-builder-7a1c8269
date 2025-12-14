/**
 * useDeviceDetect.ts
 * 
 * Comprehensive device detection hook for ALL platforms
 * Supports: Mobile, Tablets, Laptops, Desktops, Chromebooks, Foldables, TVs
 */

import { useState, useEffect, useMemo } from 'react';

export interface DeviceInfo {
  // Device category
  deviceCategory: 'mobile' | 'phablet' | 'tablet' | 'laptop' | 'desktop' | 'tv' | 'unknown';
  
  // Device types
  isMobile: boolean;
  isPhablet: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  isTV: boolean;
  isFoldable: boolean;
  isFoldOpen: boolean;
  isChromebook: boolean;
  
  // Operating System
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'chromeos' | 'tvos' | 'unknown';
  osVersion: string;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  isChromeOS: boolean;
  
  // Browser
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'samsung' | 'brave' | 'vivaldi' | 'unknown';
  browserVersion: string;
  
  // Specific devices
  isIPhone: boolean;
  isIPad: boolean;
  isAndroidPhone: boolean;
  isAndroidTablet: boolean;
  isMac: boolean;
  isSamsungGalaxy: boolean;
  isSamsungFold: boolean;
  isPixel: boolean;
  isKindleFire: boolean;
  
  // Input capabilities
  isTouch: boolean;
  isStylus: boolean;
  isMouse: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  
  // PWA/Native
  isPWA: boolean;
  isStandalone: boolean;
  isNativeApp: boolean;
  
  // Display
  isRetina: boolean;
  isRetina3x: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  
  // Preferences
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;
  prefersHighContrast: boolean;
  
  // Network
  isOnline: boolean;
  connectionType: string;
}

export function useDeviceDetect(): DeviceInfo {
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [screenHeight, setScreenHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 768);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isLandscape, setIsLandscape] = useState(typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const deviceInfo = useMemo<DeviceInfo>(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return getDefaultDeviceInfo();
    }

    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';

    // OS Detection
    const isIOS = /iphone|ipad|ipod/.test(ua) || (platform === 'macintel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    const isWindows = /win/.test(platform) || /windows/.test(ua);
    const isMacOS = /mac/.test(platform) && !isIOS;
    const isLinux = /linux/.test(platform) && !isAndroid;
    const isChromeOS = /cros/.test(ua);

    // Device type detection
    const isIPhone = isIOS && !/ipad/.test(ua) && navigator.maxTouchPoints <= 5;
    const isIPad = isIOS && (/ipad/.test(ua) || (platform === 'macintel' && navigator.maxTouchPoints > 1));
    const isAndroidTablet = isAndroid && !/mobile/.test(ua);
    const isAndroidPhone = isAndroid && /mobile/.test(ua);
    
    // Samsung detection
    const isSamsungGalaxy = /samsung|sm-g|sm-a|sm-n/.test(ua);
    const isSamsungFold = /sm-f/.test(ua);
    
    // Google Pixel detection
    const isPixel = /pixel/.test(ua);
    
    // Amazon Kindle detection
    const isKindleFire = /kindle|kf/.test(ua);
    
    // TV detection
    const isTV = /tv|smarttv|googletv|appletv|webos|tizen/.test(ua) || screenWidth >= 1920 && screenHeight >= 1080;
    
    // Foldable detection
    const isFoldable = isSamsungFold || screenWidth <= 300;
    const isFoldOpen = isFoldable && screenWidth > 500;

    // Screen size based detection
    const isPhablet = screenWidth >= 428 && screenWidth < 768;
    const isMobile = screenWidth < 428;
    const isTablet = screenWidth >= 768 && screenWidth < 1024;
    const isLaptop = screenWidth >= 1024 && screenWidth < 1280;
    const isDesktop = screenWidth >= 1280;
    const isChromebook = isChromeOS && screenWidth >= 1024;
    
    // Device category
    const deviceCategory = isTV ? 'tv' : isDesktop ? 'desktop' : isLaptop ? 'laptop' : 
                          isTablet ? 'tablet' : isPhablet ? 'phablet' : isMobile ? 'mobile' : 'unknown';

    // Browser detection
    const isChrome = /chrome/.test(ua) && !/edge|edg|opr|opera|brave/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|chromium/.test(ua);
    const isFirefox = /firefox/.test(ua);
    const isEdge = /edge|edg/.test(ua);
    const isOpera = /opr|opera/.test(ua);
    const isSamsung = /samsungbrowser/.test(ua);
    const isBrave = /brave/.test(ua) || !!(navigator as any).brave;

    // Get browser version
    const getBrowserVersion = () => {
      if (isChrome) return ua.match(/chrome\/(\d+)/)?.[1] || '';
      if (isSafari) return ua.match(/version\/(\d+)/)?.[1] || '';
      if (isFirefox) return ua.match(/firefox\/(\d+)/)?.[1] || '';
      if (isEdge) return ua.match(/edg\/(\d+)/)?.[1] || '';
      return '';
    };

    // Get OS version
    const getOSVersion = () => {
      if (isIOS) return ua.match(/os (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
      if (isAndroid) return ua.match(/android (\d+\.?\d*)/)?.[1] || '';
      if (isWindows) return ua.match(/windows nt (\d+\.?\d*)/)?.[1] || '';
      if (isMacOS) return ua.match(/mac os x (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
      return '';
    };

    // Input capabilities
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isStylus = window.matchMedia('(hover: none) and (pointer: fine)').matches;

    // PWA detection
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true ||
                  document.referrer.includes('android-app://');

    // Preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    // Display
    const pixelRatio = window.devicePixelRatio || 1;
    const isRetina = pixelRatio >= 2;

    // Connection
    const connection = (navigator as any).connection;
    const connectionType = connection?.effectiveType || 'unknown';

    return {
      // Device category
      deviceCategory,
      
      // Device types
      isMobile,
      isPhablet,
      isTablet,
      isLaptop,
      isDesktop,
      isTV,
      isFoldable,
      isFoldOpen,
      isChromebook,
      
      // OS
      os: isIOS ? 'ios' : isAndroid ? 'android' : isWindows ? 'windows' : 
          isMacOS ? 'macos' : isLinux ? 'linux' : isChromeOS ? 'chromeos' : 'unknown',
      osVersion: getOSVersion(),
      isIOS,
      isAndroid,
      isWindows,
      isMacOS,
      isLinux,
      isChromeOS,

      // Browser
      browser: isChrome ? 'chrome' : isSafari ? 'safari' : isFirefox ? 'firefox' :
               isEdge ? 'edge' : isOpera ? 'opera' : isSamsung ? 'samsung' : 
               isBrave ? 'brave' : 'unknown',
      browserVersion: getBrowserVersion(),

      // Specific devices
      isIPhone,
      isIPad,
      isAndroidPhone,
      isAndroidTablet,
      isMac: isMacOS,
      isSamsungGalaxy,
      isSamsungFold,
      isPixel,
      isKindleFire,

      // Capabilities
      isTouch,
      isStylus,
      isMouse,
      hasCamera: !!(navigator.mediaDevices?.getUserMedia),
      hasMicrophone: !!(navigator.mediaDevices?.getUserMedia),

      // PWA/Native
      isPWA,
      isStandalone: isPWA,
      isNativeApp: !!(window as any).Capacitor?.isNativePlatform?.(),

      // Display
      isRetina,
      isRetina3x: pixelRatio >= 3,
      isLandscape,
      isPortrait: !isLandscape,
      screenWidth,
      screenHeight,
      pixelRatio,

      // Preferences
      prefersReducedMotion,
      prefersDarkMode,
      prefersHighContrast,

      // Network
      isOnline,
      connectionType,
    };
  }, [screenWidth, screenHeight, isOnline, isLandscape]);

  return deviceInfo;
}

function getDefaultDeviceInfo(): DeviceInfo {
  return {
    deviceCategory: 'desktop',
    isMobile: false,
    isPhablet: false,
    isTablet: false,
    isLaptop: false,
    isDesktop: true,
    isTV: false,
    isFoldable: false,
    isFoldOpen: false,
    isChromebook: false,
    os: 'unknown',
    osVersion: '',
    isIOS: false,
    isAndroid: false,
    isWindows: false,
    isMacOS: false,
    isLinux: false,
    isChromeOS: false,
    browser: 'unknown',
    browserVersion: '',
    isIPhone: false,
    isIPad: false,
    isAndroidPhone: false,
    isAndroidTablet: false,
    isMac: false,
    isSamsungGalaxy: false,
    isSamsungFold: false,
    isPixel: false,
    isKindleFire: false,
    isTouch: false,
    isStylus: false,
    isMouse: true,
    hasCamera: false,
    hasMicrophone: false,
    isPWA: false,
    isStandalone: false,
    isNativeApp: false,
    isRetina: false,
    isRetina3x: false,
    isLandscape: true,
    isPortrait: false,
    screenWidth: 1024,
    screenHeight: 768,
    pixelRatio: 1,
    prefersReducedMotion: false,
    prefersDarkMode: false,
    prefersHighContrast: false,
    isOnline: true,
    connectionType: 'unknown',
  };
}

// Utility hook for responsive breakpoints
export function useBreakpoint() {
  const { screenWidth } = useDeviceDetect();
  
  return {
    xs: screenWidth >= 320,
    sm: screenWidth >= 480,
    md: screenWidth >= 768,
    lg: screenWidth >= 1024,
    xl: screenWidth >= 1280,
    '2xl': screenWidth >= 1536,
    '3xl': screenWidth >= 1920,
  };
}

// Utility hook for orientation
export function useOrientation() {
  const { isLandscape, isPortrait } = useDeviceDetect();
  return { isLandscape, isPortrait };
}

// Utility hook for online status
export function useOnlineStatus() {
  const { isOnline, connectionType } = useDeviceDetect();
  return { isOnline, connectionType };
}
