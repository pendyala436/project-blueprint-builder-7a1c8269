# Global Screen-Capture Protection — Setup Guide

This project now blocks screen capture at every layer where the platform allows it. Here is what is enabled and what you must do once.

## 1. Web app (every page) — already active ✅

`src/components/ScreenCaptureGuard.tsx` is mounted at the root of `src/App.tsx`, so every route is protected by:

- **Forensic diagonal watermark** with the signed-in user's email + UUID + live timestamp. Tiled and rotated so cropping cannot remove it. Renders at `mix-blend-mode: difference` so it appears on both light and dark backgrounds without harming UX.
- **Visibility blanker** — when the tab loses focus (user opens a screenshot tool, switches windows), the UI is covered with a black overlay until they return.
- **Context-menu / long-press block** on `<img>` and any `[data-protected]` element, preventing "Save image as…" leakage.

> ⚠️ Browsers expose **no API** to truly block screenshots or screen recording. The watermark is a forensic deterrent — if a screenshot leaks, you can identify the user account that captured it.

This protection covers:
- `https://meowmeow123.lovable.app` (browser)
- The PWA installed to home screen
- The TWA wrapper in `rajeshrajesh/` (which is just Chrome — it cannot use FLAG_SECURE)

## 2. Capacitor Android (every page) — one-time native patch required 🔒

True OS-level screenshot blocking on Android is only possible from the **Capacitor native shell** (`capacitor.config.ts` is already configured). After you `npx cap add android`, replace `MainActivity.java`:

**Path:** `android/app/src/main/java/app/lovable/meowmeow/MainActivity.java`

Copy the contents of `android-patches/MainActivity.java` (in this repo) over the auto-generated file. The key line is:

```java
getWindow().setFlags(
    WindowManager.LayoutParams.FLAG_SECURE,
    WindowManager.LayoutParams.FLAG_SECURE
);
```

This is set **before `super.onCreate`** so every screen — login, chat, video call, wallet, admin — is blocked from the very first frame. The OS will:

- ❌ Block screenshots (Power + Volume Down → "Couldn't capture screenshot")
- ❌ Block screen recording (built-in Android recorder, scrcpy, all third-party recorders show black)
- ❌ Show a black thumbnail in the recent-apps switcher
- ❌ Block casting / mirroring to TV

Then run:
```bash
npm run build
npx cap sync android
npx cap run android
```

Test by attempting a screenshot — Android will show a "Screenshots aren't allowed by the app or your organization" toast.

## 3. iOS — partial only ⚠️

Apple does **not** allow blocking screenshots (App Store policy). The web watermark from layer 1 is your only defence on iOS.

If you want recording **detection** (blur the UI when the user starts a screen recording), the existing Flutter service `flutter/lib/core/services/screenshot_protection_service.dart` already does this for the Flutter build. For the Capacitor iOS build, add the `capacitor-privacy-screen` plugin and listen to `UIApplication.userDidTakeScreenshotNotification` — happy to wire that up if you confirm you want it.

## 4. TWA Android (`rajeshrajesh/`) — NOT blockable ⚠️

TWAs run inside Chrome. Chrome ignores `FLAG_SECURE` for security/usability reasons. If you need real Android blocking, ship the **Capacitor** build to Play Store instead of (or alongside) the TWA. The web watermark still applies.

## Summary matrix

| Surface | Screenshot blocked | Recording blocked | Watermark |
|---|---|---|---|
| Web browser | ❌ impossible | ❌ impossible | ✅ |
| PWA (installed) | ❌ impossible | ❌ impossible | ✅ |
| TWA (`rajeshrajesh/`) | ❌ Chrome ignores flag | ❌ | ✅ |
| **Capacitor Android** | ✅ **after MainActivity patch** | ✅ | ✅ |
| Capacitor iOS | ❌ Apple policy | ⚠️ detect only | ✅ |
| Flutter Android | ✅ via `screen_protector` | ✅ | n/a |
| Flutter iOS | ❌ Apple policy | ⚠️ detect only | n/a |
| **External camera photo** | ❌ impossible anywhere | — | ✅ traceable |
