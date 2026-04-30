# Flutter App Setup — Meow Meow

Companion mobile app sharing the **same Supabase database, edge functions, and
RPCs** as the React web app. No backend or DB changes required.

---

## ⚠️ About `ios/` and `android/` folders

Flutter uses **one shared Dart codebase** (`lib/`). The `ios/` and `android/`
folders are platform-specific native shells (Xcode project + Gradle project)
that are **auto-generated** by `flutter create`. They are not hand-written
and are not in this repo — you generate them locally on your machine.

You do **not** maintain two parallel UIs. Same Dart code → both platforms.

---

## Local setup (one-time)

### 1. Install Flutter SDK
- https://docs.flutter.dev/get-started/install
- Verify: `flutter doctor`

### 2. Tooling per target
- **Android**: Android Studio + Android SDK + Java 17
- **iOS**: macOS + Xcode + CocoaPods (`sudo gem install cocoapods`)

### 3. Generate the Flutter project around this `lib/`
From the `flutter/` directory:

```bash
# Creates ios/, android/, web/, etc. — leaves lib/ untouched if it exists
flutter create --org com.meowmeow --project-name meow_meow .

# Install dependencies
flutter pub get

# Generate Freezed/JSON serialization code
flutter pub run build_runner build --delete-conflicting-outputs
```

### 4. Wire Supabase credentials
Edit `lib/core/config/supabase_config.dart` and set:
- `SUPABASE_URL` → same as `VITE_SUPABASE_URL` in the web `.env`
- `SUPABASE_ANON_KEY` → same as `VITE_SUPABASE_PUBLISHABLE_KEY`

(Anon key is safe to ship in the binary — RLS protects everything.)

### 5. Run

```bash
# Android emulator or device
flutter run -d android

# iOS simulator (macOS only)
flutter run -d ios

# List available devices
flutter devices
```

### 6. Build release artifacts

```bash
# Android APK (sideload / Play Internal testing)
flutter build apk --release

# Android App Bundle (Play Store)
flutter build appbundle --release

# iOS (requires Apple Developer account + signing in Xcode)
flutter build ipa --release
```

---

## What's done

| Layer | Status |
|---|---|
| Database | ✅ Shared with web — zero changes |
| Edge functions / RPCs | ✅ Shared with web — zero changes |
| Auth, RLS, Storage, Realtime | ✅ Shared |
| Dart services (18 files) | ✅ Scaffolded |
| Models (7) | ✅ Scaffolded (Freezed) |
| Router (`go_router`) | ✅ All routes wired |
| Theme system | ✅ Matches web tokens |
| Most screens | ✅ Built |
| Stub tabs (chats / matches / groups) | ✅ Filled (this commit) |
| Shift screens | ✅ Placeholder added |

## What's still TODO (Phase 2)

These are non-trivial and need a working local Flutter env to test:

1. **WebRTC video / group calls**
   - Add `flutter_webrtc` package
   - Reuse the same signaling RPCs the web uses
   - Implement `video_call_screen.dart` for real
2. **Razorpay payment flow** (men's wallet recharge)
   - Add `razorpay_flutter` package
   - Wire to existing `razorpay-payment` and `razorpay-webhook` edge functions
3. **KYC 9-section form** (women's payouts)
   - Build `kyc_screen.dart`, hits same KYC tables as web
4. **FCM push notifications**
   - Add `firebase_messaging`, configure `google-services.json` / `GoogleService-Info.plist`
   - Token registration → existing `send-push` edge function
5. **Realtime chat wiring inside `chat_screen.dart`**
   - Use `supabase.channel().onPostgresChanges(...)` for messages
6. **Screenshot / copy protection**
   - Android: `FLAG_SECURE` via platform channel
   - iOS: detect `UIScreen.capturedDidChangeNotification`
7. **AI photo verification**
   - Either: TFLite on-device (heavy)
   - Or (recommended): call a server-side verification edge function

---

## Drift discipline (critical)

> **All business logic — billing, idempotency, mutual exclusion, month-end
> rollover, content moderation — lives in Postgres functions or edge
> functions. Never duplicate it in Dart or React. Both clients are thin
> shells over the same backend.**

If you change a price, a rule, or a workflow, change the **RPC / edge
function**, never the client. This is what keeps web + Flutter in sync.

---

## Debugging

- **App won't compile after `flutter pub get`**: run
  `flutter pub run build_runner build --delete-conflicting-outputs`
  to regenerate Freezed/JSON code.
- **Auth session not persisting**: check `flutter_secure_storage`
  permissions in `ios/Runner/Info.plist` (Keychain) and Android
  manifest.
- **Realtime not firing**: confirm RLS policies allow the user to
  `select` from the table they're subscribing to.
- **Slow first launch on iOS**: normal — Flutter compiles ahead-of-time.
