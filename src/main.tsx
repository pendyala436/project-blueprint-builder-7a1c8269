import { createRoot } from "react-dom/client";

// Inline critical CSS synchronously for fastest FCP
import "./index.css";

const APP_MOUNTED_ATTR = "data-app-mounted";

// Global error handler — catches anything that slips through React ErrorBoundary
window.addEventListener("error", (event) => {
  console.error("[FATAL] Uncaught error:", event.error);
  showFatalError(event.error?.message || "Unknown error");
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[FATAL] Unhandled rejection:", event.reason);
  showFatalError(event.reason instanceof Error ? event.reason.message : "Startup failed");
});

function markAppMounted() {
  document.documentElement.setAttribute(APP_MOUNTED_ATTR, "true");
}

function showFatalError(message: string) {
  const root = document.getElementById("root");
  if (!root || document.documentElement.getAttribute(APP_MOUNTED_ATTR) === "true") return;

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

// Recover from stale Supabase sessions left over from a previous domain/build.
// Symptom: 403 "invalid claim: missing sub claim" / bad_jwt on /user calls,
// which prevents login UX from working until storage is cleared.
function purgeStaleSupabaseSessionIfBroken() {
  try {
    if (typeof localStorage === "undefined") return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.includes("supabase.auth"))) keys.push(k);
    }
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const token: string | undefined =
          parsed?.access_token || parsed?.currentSession?.access_token;
        if (!token || typeof token !== "string" || token.split(".").length !== 3) {
          localStorage.removeItem(k);
          continue;
        }
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        // Missing `sub` => malformed/legacy token => will 403 forever. Drop it.
        // Also drop tokens whose issuer doesn't match current Supabase URL.
        const expectedIss = "https://tvneohngeracipjajzos.supabase.co/auth/v1";
        if (!payload?.sub || (payload?.iss && payload.iss !== expectedIss)) {
          localStorage.removeItem(k);
        }
      } catch {
        // Corrupt entry — remove it so Supabase client starts clean.
        localStorage.removeItem(k);
      }
    }
  } catch {
    // ignore — never block bootstrap
  }
}

async function bootstrap() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  purgeStaleSupabaseSessionIfBroken();

  const root = createRoot(rootElement);
  const { default: App } = await import("./App");
  root.render(<App />);
  requestAnimationFrame(() => {
    markAppMounted();
  });
}

bootstrap().catch((err) => {
  console.error("[FATAL] App bootstrap failed:", err);
  showFatalError(err instanceof Error ? err.message : "App failed to start");
});

// Load polyfills in background (non-blocking)
if (typeof window !== "undefined") {
  const idleCallback = window.requestIdleCallback?.bind(window);
  const loadPolyfills = () => {
    import("./lib/polyfills").then(({ default: loadPolyfills }) => {
      loadPolyfills();
    });
  };

  if (idleCallback) {
    idleCallback(loadPolyfills);
  } else {
    setTimeout(loadPolyfills, 2000);
  }
}
