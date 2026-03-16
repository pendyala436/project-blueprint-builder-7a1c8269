import { createRoot } from "react-dom/client";
import App from "./App";

// Inline critical CSS synchronously for fastest FCP
import "./index.css";

// Global error handler — catches anything that slips through React ErrorBoundary
window.addEventListener('error', (event) => {
  console.error('[FATAL] Uncaught error:', event.error);
  showFatalError(event.error?.message || 'Unknown error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[FATAL] Unhandled rejection:', event.reason);
  // Don't show UI for minor async failures, only for startup-blocking ones
});

function showFatalError(message: string) {
  const root = document.getElementById('root');
  if (!root || root.children.length > 1) return; // React already rendered
  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0d14;color:#fff;font-family:sans-serif;padding:20px;text-align:center">
      <div>
        <h1 style="font-size:24px;margin-bottom:12px">Something went wrong</h1>
        <p style="color:#888;margin-bottom:20px;font-size:14px">${message}</p>
        <button onclick="(async()=>{if('serviceWorker' in navigator){const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(r=>r.unregister()))}if('caches' in window){const k=await caches.keys();await Promise.all(k.map(k=>caches.delete(k)))}location.reload()})()" style="padding:10px 24px;background:#0ea5e9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">
          Clear Cache & Reload
        </button>
      </div>
    </div>
  `;
}

// Render with error boundary
try {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
} catch (err) {
  console.error('[FATAL] React render failed:', err);
  showFatalError(err instanceof Error ? err.message : 'React failed to start');
}

// Load polyfills in background (non-blocking)
if (typeof window !== 'undefined') {
  requestIdleCallback?.(() => {
    import("./lib/polyfills").then(({ default: loadPolyfills }) => {
      loadPolyfills();
    });
  }) ?? setTimeout(() => {
    import("./lib/polyfills").then(({ default: loadPolyfills }) => {
      loadPolyfills();
    });
  }, 2000);
}
