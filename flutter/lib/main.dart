import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config/app_config.dart';
import 'core/config/supabase_config.dart';
import 'core/router/app_router.dart';
import 'core/services/notification_service.dart';
import 'core/services/offline_cache_service.dart';
import 'core/services/background_sync_service.dart';
import 'shared/providers/locale_provider.dart';
import 'shared/providers/theme_provider.dart';
import 'core/l10n/app_localizations.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for local storage (PWA-like caching)
  await Hive.initFlutter();

  // Initialize offline cache service (synced with sw.ts)
  await OfflineCacheService.instance.initialize();

  // Initialize Supabase
  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
    realtimeClientOptions: const RealtimeClientOptions(
      logLevel: RealtimeLogLevel.info,
    ),
  );

  // Initialize notifications (synced with sw.ts push handlers)
  await NotificationService.initialize();

  // Initialize background sync (synced with sw.ts sync handlers)
  await BackgroundSyncService.instance.initialize();

  // Set preferred orientations (synced with manifest.json orientation: "any")
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Set system UI overlay style (synced with manifest.json theme_color/background_color)
  SystemChrome.setSystemUIOverlayStyle(
    SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: _hexToColor(AppConfig.backgroundColor),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    const ProviderScope(
      child: MeowMeowApp(),
    ),
  );
}

/// Convert hex color string to Color
Color _hexToColor(String hex) {
  hex = hex.replaceFirst('#', '');
  if (hex.length == 6) hex = 'FF$hex';
  return Color(int.parse(hex, radix: 16));
}

class MeowMeowApp extends ConsumerWidget {
  const MeowMeowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeModeProvider);
    final currentTheme = ref.watch(currentThemeProvider);

    // Build light and dark themes from the selected theme
    final lightTheme = currentTheme.toThemeData(Brightness.light);
    final darkTheme = currentTheme.toThemeData(Brightness.dark);

    return MaterialApp.router(
      // App name synced with manifest.json
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: themeMode,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: router,
      // Handle deep links (synced with manifest.json protocol_handlers)
      builder: (context, child) {
        return _AppLifecycleHandler(
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

/// Handle app lifecycle for PWA-like behavior
class _AppLifecycleHandler extends StatefulWidget {
  final Widget child;
  
  const _AppLifecycleHandler({required this.child});

  @override
  State<_AppLifecycleHandler> createState() => _AppLifecycleHandlerState();
}

class _AppLifecycleHandlerState extends State<_AppLifecycleHandler> 
    with WidgetsBindingObserver {
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkForSharedData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    BackgroundSyncService.instance.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        // App came to foreground - sync pending data
        BackgroundSyncService.instance.forcSync();
        break;
      case AppLifecycleState.paused:
        // App went to background - cleanup expired cache
        OfflineCacheService.instance.cleanupExpiredEntries();
        break;
      default:
        break;
    }
  }

  /// Check for shared data (synced with manifest.json share_target)
  Future<void> _checkForSharedData() async {
    final sharedData = await OfflineCacheService.instance.getSharedData();
    if (sharedData != null && mounted) {
      // Handle shared data (title, text, url, files)
      final title = sharedData['title'];
      final text = sharedData['text'];
      final url = sharedData['url'];
      
      // Navigate to appropriate screen or show dialog
      if (title != null || text != null || url != null) {
        // TODO: Handle shared content appropriately
        debugPrint('Shared data received: $sharedData');
      }
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
