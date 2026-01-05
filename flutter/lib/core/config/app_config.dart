/// App Configuration
/// 
/// Contains app-wide configuration values.
/// Synced with React constants (src/constants/index.ts)
class AppConfig {
  AppConfig._();

  /// App Information
  static const String appName = 'Meow Meow';
  static const String appVersion = '1.0.0';
  static const int buildNumber = 1;

  /// API Configuration
  static const int apiTimeout = 30000; // 30 seconds
  static const int maxRetries = 3;

  /// Cache Configuration
  static const int cacheMaxAge = 300; // 5 minutes in seconds
  static const int maxCacheSize = 100; // Max number of cached items

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
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  /// Authentication (synced with React)
  static const int minPasswordLength = 8;
  static const int maxLoginAttempts = 5;
  static const int lockoutDuration = 900; // 15 minutes in seconds

  /// Feature Flags
  static const bool enableVideoCall = true;
  static const bool enableVoiceMessages = true;
  static const bool enableTranslation = true;
  static const bool enableOfflineMode = true;

  /// Content Limits (synced with React LIMITS)
  static const int maxBioLength = 500;
  static const int maxPhotos = 6;
  static const int maxInterests = 10;
  static const int maxLanguages = 5;
  static const int maxFileSizeMB = 10;

  /// Currency (synced with React CURRENCY)
  static const String defaultCurrency = 'INR';
  static const String currencySymbol = '₹';
  static const List<String> supportedCurrencies = ['INR', 'USD', 'EUR'];

  /// Pricing Defaults (synced with database defaults)
  static const double defaultRatePerMinute = 2.0;
  static const double defaultWomenEarningRate = 2.0;
  static const double defaultVideoRatePerMinute = 10.0;
  static const double defaultVideoWomenEarningRate = 5.0;
}
