/**
 * Route Preloading Hook
 * 
 * Preloads route chunks on link hover/visibility
 * for instant navigation (<2ms perceived transition)
 */

import { useCallback, useEffect, useRef } from 'react';

// Track what's already been preloaded
const preloaded = new Set<string>();

// Route-to-import mapping for preloading
const routeImports: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/DashboardScreen'),
  '/women-dashboard': () => import('@/pages/WomenDashboardScreen'),
  '/wallet': () => import('@/pages/WalletScreen'),
  '/women-wallet': () => import('@/pages/WomenWalletScreen'),
  '/settings': () => import('@/pages/SettingsScreen'),
  '/online-users': () => import('@/pages/OnlineUsersScreen'),
  '/find-match': () => import('@/pages/MatchingScreen'),
  '/match-discovery': () => import('@/pages/MatchDiscoveryScreen'),
  '/transaction-history': () => import('@/pages/TransactionHistoryScreen'),
};

/**
 * Preload a route's chunk so navigation is instant
 */
export function preloadRoute(path: string): void {
  if (preloaded.has(path)) return;
  
  const importFn = routeImports[path];
  if (importFn) {
    preloaded.add(path);
    // Use requestIdleCallback to avoid blocking main thread
    const load = () => importFn().catch(() => preloaded.delete(path));
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(load, { timeout: 2000 });
    } else {
      setTimeout(load, 100);
    }
  }
}

/**
 * Preload adjacent routes based on current location
 */
export function useRoutePreload(currentPath: string): void {
  const preloadedRef = useRef(false);
  
  useEffect(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;
    
    // Preload likely next routes based on current path
    const adjacentRoutes: Record<string, string[]> = {
      '/': ['/dashboard', '/women-dashboard'],
      '/dashboard': ['/wallet', '/settings', '/online-users', '/find-match'],
      '/women-dashboard': ['/women-wallet', '/settings'],
      '/wallet': ['/transaction-history'],
    };
    
    const toPreload = adjacentRoutes[currentPath];
    if (toPreload) {
      toPreload.forEach(route => {
        preloadRoute(route);
      });
    }
  }, [currentPath]);
}

/**
 * Returns onMouseEnter handler that preloads a route on hover
 */
export function useHoverPreload(path: string) {
  return useCallback(() => {
    preloadRoute(path);
  }, [path]);
}
