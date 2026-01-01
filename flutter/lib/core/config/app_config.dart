/// App Configuration
/// 
/// Contains app-wide configuration values.
/// Synced with React web app (vite.config.ts, manifest.json, sw.ts)
class AppConfig {
  AppConfig._();

  /// App Information - Synced with manifest.json
  static const String appName = 'Meow Meow';
  static const String appFullName = 'Meow Meow - Dating & Chat';
  static const String appDescription = 'Connect, chat, and find meaningful relationships with Meow Meow dating app. Available on all devices.';
  static const String appVersion = '1.0.0';
  static const int buildNumber = 1;
  static const String appId = 'app.lovable.83206b95108442d8a3efe71e72b4dab6';

  /// Theme Colors - Synced with manifest.json
  static const String themeColor = '#1aa39b';
  static const String backgroundColor = '#0a0d14';

  /// API Configuration
  static const int apiTimeout = 30000; // 30 seconds
  static const int apiNetworkTimeout = 10; // seconds (synced with sw.ts NetworkFirst timeout)
  static const int maxRetries = 3;

  /// Cache Configuration - Synced with sw.ts workbox settings
  static const String cachePrefix = 'meowmeow-pwa';
  static const int cacheMaxAge = 300; // 5 minutes in seconds
  static const int maxCacheSize = 100; // Max number of cached items
  
  /// Cache Expiration (synced with vite.config.ts and sw.ts)
  static const int apiCacheSeconds = 60 * 60; // 1 hour
  static const int imageCacheSeconds = 60 * 60 * 24 * 30; // 30 days
  static const int fontCacheSeconds = 60 * 60 * 24 * 365; // 1 year
  static const int staticCacheSeconds = 60 * 60 * 24 * 7; // 7 days
  static const int mediaCacheSeconds = 60 * 60 * 24 * 7; // 7 days
  
  /// Cache Max Entries (synced with sw.ts)
  static const int apiCacheMaxEntries = 100;
  static const int imageCacheMaxEntries = 200;
  static const int fontCacheMaxEntries = 30;
  static const int staticCacheMaxEntries = 100;
  static const int mediaCacheMaxEntries = 50;

  /// Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  /// Chat Configuration (synced with React LIMITS)
  static const int messageRateLimit = 60; // messages per minute
  static const int maxMessageLength = 2000; // synced
  static const int maxParallelChats = 3; // synced with React LIMITS.MAX_PARALLEL_CHATS
  static const int chatSessionTimeout = 30; // minutes

  /// Media Configuration
  static const int maxImageSize = 5 * 1024 * 1024; // 5MB
  static const int maxVideoSize = 50 * 1024 * 1024; // 50MB
  static const int maxFileSizeMB = 10;
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  static const List<String> allowedMediaTypes = ['image/*', 'video/*']; // synced with manifest share_target

  /// Authentication (synced with React)
  static const int minPasswordLength = 8;
  static const int maxLoginAttempts = 5;
  static const int lockoutDuration = 900; // 15 minutes in seconds

  /// Feature Flags
  static const bool enableVideoCall = true;
  static const bool enableVoiceMessages = true;
  static const bool enableTranslation = true;
  static const bool enableOfflineMode = true;
  static const bool enableBackgroundSync = true;
  static const bool enablePushNotifications = true;

  /// Content Limits (synced with React LIMITS)
  static const int maxBioLength = 500;
  static const int maxPhotos = 6;
  static const int maxInterests = 10;
  static const int maxLanguages = 5;

  /// Currency (synced with React CURRENCY)
  static const String defaultCurrency = 'INR';
  static const String currencySymbol = '₹';
  static const List<String> supportedCurrencies = ['INR', 'USD', 'EUR'];

  /// Pricing Defaults (synced with database defaults)
  static const double defaultRatePerMinute = 2.0;
  static const double defaultWomenEarningRate = 2.0;
  static const double defaultVideoRatePerMinute = 10.0;
  static const double defaultVideoWomenEarningRate = 5.0;

  /// App Categories (synced with manifest.json)
  static const List<String> appCategories = ['social', 'lifestyle', 'dating', 'entertainment'];

  /// App Shortcuts (synced with manifest.json shortcuts)
  static const List<Map<String, String>> appShortcuts = [
    {'name': 'Dashboard', 'shortName': 'Home', 'url': '/dashboard'},
    {'name': 'My Wallet', 'shortName': 'Wallet', 'url': '/wallet'},
    {'name': 'Find Matches', 'shortName': 'Matches', 'url': '/match-discovery'},
    {'name': 'Settings', 'shortName': 'Settings', 'url': '/settings'},
  ];

  /// Protocol Handler (synced with manifest.json)
  static const String protocolScheme = 'meowmeow';
  static const String webProtocolScheme = 'web+meowmeow';

  /// Related Applications (synced with manifest.json)
  static const String playStoreId = 'app.lovable.83206b95108442d8a3efe71e72b4dab6';
  static const String appStoreId = 'app.lovable.83206b95108442d8a3efe71e72b4dab6';
}
