/// App Configuration
/// 
/// Contains app-wide configuration values.
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

  /// Chat Configuration
  static const int messageRateLimit = 60; // messages per minute
  static const int maxMessageLength = 1000;
  static const int chatSessionTimeout = 30; // minutes

  /// Media Configuration
  static const int maxImageSize = 5 * 1024 * 1024; // 5MB
  static const int maxVideoSize = 50 * 1024 * 1024; // 50MB
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  /// Authentication
  static const int minPasswordLength = 8;
  static const int maxLoginAttempts = 5;
  static const int lockoutDuration = 900; // 15 minutes in seconds

  /// Feature Flags
  static const bool enableVideoCall = true;
  static const bool enableVoiceMessages = true;
  static const bool enableTranslation = true;
  static const bool enableOfflineMode = true;
}
