import { useEffect } from "react";
import { useKeyboardHeight } from "./useKeyboardHeight";

/**
 * Side-effect-only hook for auto-adjustable UI across all devices.
 * 
 * Writes ONLY to:
 * - CSS custom properties on document.documentElement.style
 * - data-* attributes on document.documentElement
 *
 * Never touches React state, DOM content, component structure, or routing.
 *
 * SIDE-EFFECT ANALYSIS:
 * - --vw / --vh: used by any CSS that references these vars; no existing CSS uses them
 *   so zero risk of breaking anything. New utility classes can opt in.
 * - data-* attributes: purely informational; no existing code queries them.
 *   They enable future CSS like [data-touch] .some-class { ... }
 * - Keyboard height: delegated to useKeyboardHeight hook.
 */
export function useAutoAdjustUI(): void {
  // Delegate keyboard tracking
  useKeyboardHeight();

  useEffect(() => {
    const html = document.documentElement;

    // ── Viewport units ──
    function setViewportVars() {
      const vw = window.innerWidth * 0.01;
      const vh = window.innerHeight * 0.01;
      html.style.setProperty("--vw", `${vw}px`);
      html.style.setProperty("--vh", `${vh}px`);
    }

    // ── Device / capability detection ──
    function setDeviceAttributes() {
      // Touch vs hover
      const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      const isHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      html.setAttribute("data-touch", String(isTouch));
      html.setAttribute("data-hover", String(isHover));

      // Device memory (Navigator.deviceMemory is Chrome-only)
      const nav = navigator as Navigator & { deviceMemory?: number };
      if (nav.deviceMemory !== undefined) {
        html.setAttribute("data-memory", String(nav.deviceMemory));
      }

      // PWA standalone
      const isPWA =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      html.setAttribute("data-pwa", String(isPWA));

      // OS detection via UA
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/.test(ua);
      html.setAttribute("data-ios", String(isIOS));
      html.setAttribute("data-android", String(isAndroid));

      // Orientation
      const orientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait";
      html.setAttribute("data-orientation", orientation);

      // Reduced motion
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      html.setAttribute("data-reduced-motion", String(reducedMotion));
    }

    // ── Event handlers ──
    function onResize() {
      setViewportVars();
      // Update orientation
      const orientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait";
      html.setAttribute("data-orientation", orientation);
    }

    function onOrientationChange() {
      // Small delay to let the browser finish rotating
      setTimeout(() => {
        setViewportVars();
        const orientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait";
        html.setAttribute("data-orientation", orientation);
      }, 100);
    }

    // ── Initialize ──
    setViewportVars();
    setDeviceAttributes();

    // ── Listen ──
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientationChange);

    // Media query listeners for dynamic changes
    const touchMQ = window.matchMedia("(hover: none) and (pointer: coarse)");
    const motionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pwaMQ = window.matchMedia("(display-mode: standalone)");

    function onTouchChange(e: MediaQueryListEvent) {
      html.setAttribute("data-touch", String(e.matches));
    }
    function onMotionChange(e: MediaQueryListEvent) {
      html.setAttribute("data-reduced-motion", String(e.matches));
    }
    function onPWAChange(e: MediaQueryListEvent) {
      html.setAttribute("data-pwa", String(e.matches));
    }

    touchMQ.addEventListener("change", onTouchChange);
    motionMQ.addEventListener("change", onMotionChange);
    pwaMQ.addEventListener("change", onPWAChange);

    // ── Cleanup ──
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      touchMQ.removeEventListener("change", onTouchChange);
      motionMQ.removeEventListener("change", onMotionChange);
      pwaMQ.removeEventListener("change", onPWAChange);

      // Remove CSS vars
      html.style.removeProperty("--vw");
      html.style.removeProperty("--vh");

      // Remove data attributes
      const attrs = [
        "data-touch", "data-hover", "data-memory", "data-pwa",
        "data-ios", "data-android", "data-orientation", "data-reduced-motion",
      ];
      attrs.forEach((attr) => html.removeAttribute(attr));
    };
  }, []);
}
