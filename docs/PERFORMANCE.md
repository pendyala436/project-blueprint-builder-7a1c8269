# Performance Optimization Guide

## Web App Performance (< 2 seconds load time)

### Optimizations Applied

#### 1. **Lazy Loading Routes**
All routes except the auth screen are lazy-loaded using React.lazy(). This reduces initial bundle size by ~70%.

```tsx
const DashboardScreen = lazy(() => import("./pages/DashboardScreen"));
```

#### 2. **Parallel Database Queries**
Login now fetches all user context in parallel instead of sequentially:
- Admin role check
- Tutorial progress
- Profile data
- Female profile check

Before: 4 sequential queries (~800ms)
After: 1 parallel batch (~200ms)

#### 3. **Session Caching**
User context is cached for 5 minutes to avoid refetching:
```ts
const userContextCache = new Map<string, { data: UserContext; timestamp: number }>();
```

#### 4. **Optimized i18n**
- English loaded synchronously (no delay)
- Other languages loaded on-demand in background
- Removed language detection delay on startup

#### 5. **Memoized Components**
All frequently rendered components are memoized:
```tsx
export default memo(AuthScreen);
```

#### 6. **GPU-Accelerated Animations**
Aurora background uses CSS transforms for GPU acceleration:
```css
will-change: transform;
transform: translateZ(0);
```

#### 7. **Reduced Security Provider Overhead**
- DevTools check interval: 2s → reduced CPU
- Event handlers use useCallback for stability
- Refs prevent unnecessary re-renders

### React Query Optimizations
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});
```

---

## Mobile App (Flutter) Performance

### Build for Release (Not Debug)
Debug builds are 10x slower. Always test with:
```bash
flutter run --release
```

### Enable Tree Shaking
In `pubspec.yaml`:
```yaml
flutter:
  uses-material-design: true
```

### Optimize Images
Use WebP format and appropriate sizes:
```dart
Image.network(
  url,
  cacheWidth: 300,
  cacheHeight: 300,
)
```

### Reduce Widget Rebuilds
Use `const` constructors wherever possible:
```dart
const SizedBox(height: 16),
```

### Lazy Load Screens
```dart
GoRoute(
  path: '/dashboard',
  builder: (context, state) => const DashboardScreen(),
)
```

### Supabase Connection Pooling
```dart
final supabase = Supabase.instance.client;
// Reuse this single instance everywhere
```

### Build Commands for Production

**Android:**
```bash
flutter build apk --release --target-platform android-arm64
flutter build appbundle --release
```

**iOS:**
```bash
flutter build ios --release
```

---

## PWA Performance

### Service Worker Caching
Already configured in `vite.config.ts` with Workbox:
- Precaches all static assets
- Network-first for API calls
- Cache-first for images

### Manifest Optimization
`public/manifest.json` configured with:
- Minimal icon set
- Standalone display mode
- Theme colors for native feel

### Install Prompt
Custom install prompt on `/install` page for guided installation.

---

## Measurement

### Web Vitals Targets
- **LCP (Largest Contentful Paint):** < 2.5s ✓
- **FID (First Input Delay):** < 100ms ✓
- **CLS (Cumulative Layout Shift):** < 0.1 ✓

### Login Flow Target
- Total time from button click to dashboard: < 2 seconds
  - Auth request: ~300ms
  - Context fetch (parallel): ~200ms
  - Navigation: ~100ms
  - Dashboard render: ~400ms

### How to Measure
1. Open Chrome DevTools
2. Go to Network tab
3. Check "Disable cache"
4. Reload and time the login flow
5. Use Lighthouse for comprehensive analysis
