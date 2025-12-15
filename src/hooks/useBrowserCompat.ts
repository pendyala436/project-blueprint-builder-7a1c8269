/**
 * useBrowserCompat Hook
 * 
 * Comprehensive browser and feature detection for cross-browser compatibility.
 * Provides fallbacks and feature flags for all major browsers.
 */

import { useState, useEffect, useMemo } from 'react';

export interface BrowserInfo {
  // Browser identification
  name: string;
  version: string;
  engine: string;
  
  // Browser flags
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isEdgeLegacy: boolean;
  isIE: boolean;
  isOpera: boolean;
  isBrave: boolean;
  isSamsung: boolean;
  isUCBrowser: boolean;
  
  // Engine flags
  isWebKit: boolean;
  isGecko: boolean;
  isBlink: boolean;
  isTrident: boolean;
  
  // Version checks
  isModern: boolean;
  isLegacy: boolean;
  
  // Feature support
  features: FeatureSupport;
  
  // CSS support
  css: CSSSupport;
  
  // Recommendations
  needsPolyfills: boolean;
  unsupportedFeatures: string[];
}

export interface FeatureSupport {
  // Layout
  flexbox: boolean;
  flexGap: boolean;
  grid: boolean;
  subgrid: boolean;
  containerQueries: boolean;
  
  // Visual
  customProperties: boolean;
  backdropFilter: boolean;
  aspectRatio: boolean;
  objectFit: boolean;
  clipPath: boolean;
  filter: boolean;
  mixBlendMode: boolean;
  
  // Modern CSS
  cssNesting: boolean;
  colorMix: boolean;
  hasSelector: boolean;
  scrollTimeline: boolean;
  viewTransitions: boolean;
  
  // JavaScript
  intersectionObserver: boolean;
  resizeObserver: boolean;
  mutationObserver: boolean;
  webAnimations: boolean;
  serviceWorker: boolean;
  pushNotifications: boolean;
  
  // Input
  touchEvents: boolean;
  pointerEvents: boolean;
  
  // Media
  webp: boolean;
  avif: boolean;
  
  // Storage
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  
  // Network
  fetch: boolean;
  abortController: boolean;
  
  // Performance
  performanceObserver: boolean;
  requestIdleCallback: boolean;
}

export interface CSSSupport {
  sticky: boolean;
  scrollSnap: boolean;
  overscrollBehavior: boolean;
  safeAreaInset: boolean;
  dvh: boolean;
  svh: boolean;
  lvh: boolean;
}

/**
 * Detect browser information and feature support
 */
export function useBrowserCompat(): BrowserInfo {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>(() => getDefaultBrowserInfo());

  useEffect(() => {
    const info = detectBrowser();
    setBrowserInfo(info);
  }, []);

  return browserInfo;
}

function getDefaultBrowserInfo(): BrowserInfo {
  return {
    name: 'unknown',
    version: '0',
    engine: 'unknown',
    isChrome: false,
    isFirefox: false,
    isSafari: false,
    isEdge: false,
    isEdgeLegacy: false,
    isIE: false,
    isOpera: false,
    isBrave: false,
    isSamsung: false,
    isUCBrowser: false,
    isWebKit: false,
    isGecko: false,
    isBlink: false,
    isTrident: false,
    isModern: true,
    isLegacy: false,
    features: getDefaultFeatures(),
    css: getDefaultCSS(),
    needsPolyfills: false,
    unsupportedFeatures: [],
  };
}

function getDefaultFeatures(): FeatureSupport {
  return {
    flexbox: true,
    flexGap: true,
    grid: true,
    subgrid: false,
    containerQueries: false,
    customProperties: true,
    backdropFilter: true,
    aspectRatio: true,
    objectFit: true,
    clipPath: true,
    filter: true,
    mixBlendMode: true,
    cssNesting: false,
    colorMix: false,
    hasSelector: false,
    scrollTimeline: false,
    viewTransitions: false,
    intersectionObserver: true,
    resizeObserver: true,
    mutationObserver: true,
    webAnimations: true,
    serviceWorker: true,
    pushNotifications: true,
    touchEvents: false,
    pointerEvents: true,
    webp: true,
    avif: false,
    localStorage: true,
    sessionStorage: true,
    indexedDB: true,
    fetch: true,
    abortController: true,
    performanceObserver: true,
    requestIdleCallback: false,
  };
}

function getDefaultCSS(): CSSSupport {
  return {
    sticky: true,
    scrollSnap: true,
    overscrollBehavior: true,
    safeAreaInset: true,
    dvh: false,
    svh: false,
    lvh: false,
  };
}

function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return getDefaultBrowserInfo();
  }

  const ua = navigator.userAgent;
  const vendor = navigator.vendor || '';

  // Browser detection
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(vendor) && !/Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && /Apple Computer/.test(vendor);
  const isEdge = /Edg/.test(ua);
  const isEdgeLegacy = /Edge/.test(ua) && !/Edg/.test(ua);
  const isIE = /Trident/.test(ua) || /MSIE/.test(ua);
  const isOpera = /OPR/.test(ua) || /Opera/.test(ua);
  const isBrave = (navigator as any).brave !== undefined;
  const isSamsung = /SamsungBrowser/.test(ua);
  const isUCBrowser = /UCBrowser/.test(ua);

  // Engine detection
  const isWebKit = /AppleWebKit/.test(ua);
  const isGecko = /Gecko/.test(ua) && !/like Gecko/.test(ua);
  const isBlink = isChrome || isEdge || isOpera;
  const isTrident = /Trident/.test(ua);

  // Get browser name and version
  let name = 'unknown';
  let version = '0';

  if (isChrome) {
    name = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || '0';
  } else if (isFirefox) {
    name = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || '0';
  } else if (isSafari) {
    name = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || '0';
  } else if (isEdge) {
    name = 'Edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || '0';
  } else if (isEdgeLegacy) {
    name = 'Edge Legacy';
    version = ua.match(/Edge\/(\d+)/)?.[1] || '0';
  } else if (isIE) {
    name = 'Internet Explorer';
    version = ua.match(/(?:MSIE |rv:)(\d+)/)?.[1] || '0';
  } else if (isOpera) {
    name = 'Opera';
    version = ua.match(/(?:OPR|Opera)\/(\d+)/)?.[1] || '0';
  } else if (isSamsung) {
    name = 'Samsung Internet';
    version = ua.match(/SamsungBrowser\/(\d+)/)?.[1] || '0';
  } else if (isUCBrowser) {
    name = 'UC Browser';
    version = ua.match(/UCBrowser\/(\d+)/)?.[1] || '0';
  }

  const versionNum = parseInt(version, 10);
  
  // Modern browser check (approximate thresholds)
  const isModern = 
    (isChrome && versionNum >= 90) ||
    (isFirefox && versionNum >= 90) ||
    (isSafari && versionNum >= 14) ||
    (isEdge && versionNum >= 90) ||
    (isOpera && versionNum >= 76);

  const isLegacy = isIE || isEdgeLegacy || !isModern;

  // Engine name
  let engine = 'unknown';
  if (isBlink) engine = 'Blink';
  else if (isGecko) engine = 'Gecko';
  else if (isWebKit) engine = 'WebKit';
  else if (isTrident) engine = 'Trident';

  // Feature detection
  const features = detectFeatures();
  const css = detectCSSSupport();

  // Determine unsupported features
  const unsupportedFeatures: string[] = [];
  if (!features.flexGap) unsupportedFeatures.push('flexbox-gap');
  if (!features.aspectRatio) unsupportedFeatures.push('aspect-ratio');
  if (!features.backdropFilter) unsupportedFeatures.push('backdrop-filter');
  if (!features.containerQueries) unsupportedFeatures.push('container-queries');
  if (!features.intersectionObserver) unsupportedFeatures.push('intersection-observer');
  if (!features.resizeObserver) unsupportedFeatures.push('resize-observer');

  const needsPolyfills = isLegacy || unsupportedFeatures.length > 3;

  return {
    name,
    version,
    engine,
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isEdgeLegacy,
    isIE,
    isOpera,
    isBrave,
    isSamsung,
    isUCBrowser,
    isWebKit,
    isGecko,
    isBlink,
    isTrident,
    isModern,
    isLegacy,
    features,
    css,
    needsPolyfills,
    unsupportedFeatures,
  };
}

function detectFeatures(): FeatureSupport {
  if (typeof window === 'undefined') {
    return getDefaultFeatures();
  }

  const testEl = document.createElement('div');

  return {
    // Layout
    flexbox: CSS.supports('display', 'flex'),
    flexGap: CSS.supports('gap', '1px'),
    grid: CSS.supports('display', 'grid'),
    subgrid: CSS.supports('grid-template-columns', 'subgrid'),
    containerQueries: CSS.supports('container-type', 'inline-size'),

    // Visual
    customProperties: CSS.supports('--test', '0'),
    backdropFilter: CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
    aspectRatio: CSS.supports('aspect-ratio', '1'),
    objectFit: CSS.supports('object-fit', 'cover'),
    clipPath: CSS.supports('clip-path', 'circle(50%)'),
    filter: CSS.supports('filter', 'blur(1px)'),
    mixBlendMode: CSS.supports('mix-blend-mode', 'multiply'),

    // Modern CSS
    cssNesting: CSS.supports('selector(&)'),
    colorMix: CSS.supports('color', 'color-mix(in srgb, red, blue)'),
    hasSelector: CSS.supports('selector(:has(*))'),
    scrollTimeline: CSS.supports('animation-timeline', 'scroll()'),
    viewTransitions: 'startViewTransition' in document,

    // JavaScript
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    mutationObserver: 'MutationObserver' in window,
    webAnimations: 'animate' in testEl,
    serviceWorker: 'serviceWorker' in navigator,
    pushNotifications: 'PushManager' in window,

    // Input
    touchEvents: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    pointerEvents: 'PointerEvent' in window,

    // Media - test async but provide defaults
    webp: true, // Most modern browsers support WebP
    avif: false, // Limited support, needs async check

    // Storage
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    indexedDB: 'indexedDB' in window,

    // Network
    fetch: 'fetch' in window,
    abortController: 'AbortController' in window,

    // Performance
    performanceObserver: 'PerformanceObserver' in window,
    requestIdleCallback: 'requestIdleCallback' in window,
  };
}

function detectCSSSupport(): CSSSupport {
  if (typeof CSS === 'undefined') {
    return getDefaultCSS();
  }

  return {
    sticky: CSS.supports('position', 'sticky'),
    scrollSnap: CSS.supports('scroll-snap-type', 'x mandatory'),
    overscrollBehavior: CSS.supports('overscroll-behavior', 'contain'),
    safeAreaInset: CSS.supports('padding-top', 'env(safe-area-inset-top)'),
    dvh: CSS.supports('height', '1dvh'),
    svh: CSS.supports('height', '1svh'),
    lvh: CSS.supports('height', '1lvh'),
  };
}

/**
 * Hook to get CSS class names based on browser compatibility
 */
export function useBrowserClasses(): string {
  const browser = useBrowserCompat();
  
  return useMemo(() => {
    const classes: string[] = [];
    
    // Browser classes
    if (browser.isChrome) classes.push('browser-chrome');
    if (browser.isFirefox) classes.push('browser-firefox');
    if (browser.isSafari) classes.push('browser-safari');
    if (browser.isEdge) classes.push('browser-edge');
    if (browser.isIE) classes.push('browser-ie');
    
    // Engine classes
    if (browser.isWebKit) classes.push('engine-webkit');
    if (browser.isGecko) classes.push('engine-gecko');
    if (browser.isBlink) classes.push('engine-blink');
    
    // Modern/Legacy classes
    if (browser.isModern) classes.push('browser-modern');
    if (browser.isLegacy) classes.push('browser-legacy');
    
    // Feature classes
    if (!browser.features.flexGap) classes.push('no-flex-gap');
    if (!browser.features.backdropFilter) classes.push('no-backdrop-filter');
    if (!browser.features.aspectRatio) classes.push('no-aspect-ratio');
    
    return classes.join(' ');
  }, [browser]);
}

export default useBrowserCompat;
