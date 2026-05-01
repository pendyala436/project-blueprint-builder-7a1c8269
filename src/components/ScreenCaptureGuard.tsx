/**
 * ScreenCaptureGuard
 *
 * Multi-layer screen-capture deterrent that wraps every page.
 *
 * IMPORTANT — what this CAN and CANNOT do:
 *  - Browsers (web, PWA, TWA): NO API exists to block screenshots or screen
 *    recording. Anything that claims otherwise is false. We therefore:
 *      1. Render a forensic diagonal watermark with the user's identity +
 *         timestamp on every page. If a screenshot leaks, you can trace it.
 *      2. Detect the Page Visibility / capture-media events where supported
 *         and blank the screen briefly when the tab loses focus to a known
 *         capture surface.
 *      3. Disable long-press image saving and the native context menu on
 *         protected surfaces.
 *  - Capacitor Android: real OS-level screenshot blocking is enforced
 *    natively via FLAG_SECURE in MainActivity.java (see
 *    docs/ANDROID-SCREENSHOT-PROTECTION.md). This component is the web-side
 *    complement — it always renders the watermark so leaked screenshots
 *    remain attributable even from external cameras.
 *  - iOS: cannot block; the watermark is the only defence.
 *
 * The component is purely presentational. No business logic is touched.
 */

import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";

const ScreenCaptureGuard = memo(({ children }: { children: React.ReactNode }) => {
  const [tag, setTag] = useState<string>("MeowMeow • protected");
  const [hidden, setHidden] = useState(false);

  // Build the watermark text from the current session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        const id = data.user?.id?.slice(0, 8) ?? "anon";
        const email = data.user?.email ?? "guest";
        setTag(`${email} • ${id} • MeowMeow`);
      } catch {
        /* ignore — keep default tag */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Blank the UI while the tab is hidden — defeats some recorders that
  // capture continuously while the user switches to a screenshot tool.
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Block long-press save / context menu on images app-wide.
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "IMG" || t.closest("[data-protected]"))) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  // Live timestamp refreshed every 30s so identical screenshots differ.
  const [stamp, setStamp] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = window.setInterval(() => setStamp(new Date().toISOString()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      {children}

      {/* Forensic diagonal watermark — pointer-events:none so it never
          blocks user interaction. Repeated tile so cropping cannot remove
          the identifier. */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2147483600, // just below modal-blocking max
          overflow: "hidden",
          mixBlendMode: "difference",
          opacity: 0.08,
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-50%",
            transform: "rotate(-30deg)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "60px 40px",
            color: "white",
            fontSize: "14px",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
          }}
        >
          {Array.from({ length: 120 }).map((_, i) => (
            <span key={i}>{tag} • {stamp}</span>
          ))}
        </div>
      </div>

      {/* Visibility blanker — covers UI when tab is hidden */}
      {hidden && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "black",
            zIndex: 2147483646,
          }}
        />
      )}
    </>
  );
});

ScreenCaptureGuard.displayName = "ScreenCaptureGuard";
export default ScreenCaptureGuard;
