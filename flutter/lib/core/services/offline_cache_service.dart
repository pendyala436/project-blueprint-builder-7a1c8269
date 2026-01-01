import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import '../config/app_config.dart';

/// Offline Cache Service
/// 
/// Provides PWA-like caching capabilities for Flutter.
/// Synced with web app's sw.ts caching strategies.
class OfflineCacheService {
  static OfflineCacheService? _instance;
  static OfflineCacheService get instance => _instance ??= OfflineCacheService._();
  
  OfflineCacheService._();

  // Cache boxes (similar to sw.ts cache names)
  late Box<String> _apiCache;
  late Box<String> _imageCache;
  late Box<String> _offlineMessages;
  late Box<String> _offlineActions;
  late Box<String> _shareTarget;

  bool _isInitialized = false;

  /// Initialize the cache service
  Future<void> initialize() async {
    if (_isInitialized) return;

    await Hive.initFlutter();
    
    _apiCache = await Hive.openBox<String>('${AppConfig.cachePrefix}-api');
    _imageCache = await Hive.openBox<String>('${AppConfig.cachePrefix}-images');
    _offlineMessages = await Hive.openBox<String>('${AppConfig.cachePrefix}-offline-messages');
    _offlineActions = await Hive.openBox<String>('${AppConfig.cachePrefix}-offline-actions');
    _shareTarget = await Hive.openBox<String>('${AppConfig.cachePrefix}-share-target');

    _isInitialized = true;
  }

  // ========================================
  // API CACHING (NetworkFirst strategy)
  // ========================================

  /// Cache API response
  Future<void> cacheApiResponse(String key, dynamic data) async {
    final cacheEntry = {
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'maxAge': AppConfig.apiCacheSeconds,
    };
    await _apiCache.put(key, jsonEncode(cacheEntry));
    
    // Cleanup old entries if exceeding max
    await _cleanupCache(_apiCache, AppConfig.apiCacheMaxEntries);
  }

  /// Get cached API response (returns null if expired or not found)
  Future<dynamic> getCachedApiResponse(String key) async {
    final cached = _apiCache.get(key);
    if (cached == null) return null;

    try {
      final cacheEntry = jsonDecode(cached);
      final timestamp = cacheEntry['timestamp'] as int;
      final maxAge = cacheEntry['maxAge'] as int;
      final age = DateTime.now().millisecondsSinceEpoch - timestamp;

      if (age > maxAge * 1000) {
        // Expired - delete and return null
        await _apiCache.delete(key);
        return null;
      }

      return cacheEntry['data'];
    } catch (e) {
      return null;
    }
  }

  // ========================================
  // IMAGE CACHING (CacheFirst strategy)
  // ========================================

  /// Cache image URL mapping
  Future<void> cacheImage(String url, String localPath) async {
    final cacheEntry = {
      'localPath': localPath,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'maxAge': AppConfig.imageCacheSeconds,
    };
    await _imageCache.put(url, jsonEncode(cacheEntry));
    
    await _cleanupCache(_imageCache, AppConfig.imageCacheMaxEntries);
  }

  /// Get cached image path
  Future<String?> getCachedImage(String url) async {
    final cached = _imageCache.get(url);
    if (cached == null) return null;

    try {
      final cacheEntry = jsonDecode(cached);
      final timestamp = cacheEntry['timestamp'] as int;
      final maxAge = cacheEntry['maxAge'] as int;
      final age = DateTime.now().millisecondsSinceEpoch - timestamp;

      if (age > maxAge * 1000) {
        await _imageCache.delete(url);
        return null;
      }

      return cacheEntry['localPath'];
    } catch (e) {
      return null;
    }
  }

  // ========================================
  // OFFLINE MESSAGE QUEUE (Background Sync)
  // Synced with sw.ts syncMessages()
  // ========================================

  /// Queue message for offline sync
  Future<void> queueOfflineMessage(Map<String, dynamic> message) async {
    final key = 'msg_${DateTime.now().millisecondsSinceEpoch}';
    await _offlineMessages.put(key, jsonEncode(message));
  }

  /// Get all pending offline messages
  Future<List<Map<String, dynamic>>> getPendingMessages() async {
    final messages = <Map<String, dynamic>>[];
    for (final key in _offlineMessages.keys) {
      final cached = _offlineMessages.get(key);
      if (cached != null) {
        try {
          messages.add(jsonDecode(cached));
        } catch (e) {
          // Invalid entry, remove it
          await _offlineMessages.delete(key);
        }
      }
    }
    return messages;
  }

  /// Remove synced message from queue
  Future<void> removeOfflineMessage(String key) async {
    await _offlineMessages.delete(key);
  }

  /// Clear all pending messages
  Future<void> clearOfflineMessages() async {
    await _offlineMessages.clear();
  }

  // ========================================
  // OFFLINE ACTION QUEUE
  // Synced with sw.ts syncOfflineActions()
  // ========================================

  /// Queue action for offline sync
  Future<void> queueOfflineAction(Map<String, dynamic> action) async {
    final key = 'action_${DateTime.now().millisecondsSinceEpoch}';
    await _offlineActions.put(key, jsonEncode(action));
  }

  /// Get all pending offline actions
  Future<List<Map<String, dynamic>>> getPendingActions() async {
    final actions = <Map<String, dynamic>>[];
    for (final key in _offlineActions.keys) {
      final cached = _offlineActions.get(key);
      if (cached != null) {
        try {
          actions.add({
            'key': key,
            ...jsonDecode(cached),
          });
        } catch (e) {
          await _offlineActions.delete(key);
        }
      }
    }
    return actions;
  }

  /// Remove synced action from queue
  Future<void> removeOfflineAction(String key) async {
    await _offlineActions.delete(key);
  }

  // ========================================
  // SHARE TARGET
  // Synced with sw.ts handleShareTarget()
  // ========================================

  /// Store shared data
  Future<void> storeSharedData(Map<String, dynamic> data) async {
    final entry = {
      ...data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    await _shareTarget.put('share-data', jsonEncode(entry));
  }

  /// Get and clear shared data
  Future<Map<String, dynamic>?> getSharedData() async {
    final cached = _shareTarget.get('share-data');
    if (cached == null) return null;

    await _shareTarget.delete('share-data');
    try {
      return jsonDecode(cached);
    } catch (e) {
      return null;
    }
  }

  // ========================================
  // CACHE MANAGEMENT
  // ========================================

  /// Clear all caches
  Future<void> clearAllCaches() async {
    await _apiCache.clear();
    await _imageCache.clear();
    await _offlineMessages.clear();
    await _offlineActions.clear();
    await _shareTarget.clear();
  }

  /// Get approximate cache size
  Future<int> getCacheSize() async {
    int size = 0;
    
    for (final key in _apiCache.keys) {
      final value = _apiCache.get(key);
      if (value != null) size += value.length;
    }
    
    for (final key in _imageCache.keys) {
      final value = _imageCache.get(key);
      if (value != null) size += value.length;
    }
    
    return size;
  }

  /// Cleanup old entries from cache
  Future<void> _cleanupCache(Box<String> cache, int maxEntries) async {
    if (cache.length <= maxEntries) return;

    // Get entries sorted by timestamp
    final entries = <MapEntry<String, int>>[];
    for (final key in cache.keys) {
      final cached = cache.get(key);
      if (cached != null) {
        try {
          final data = jsonDecode(cached);
          entries.add(MapEntry(key as String, data['timestamp'] as int));
        } catch (e) {
          // Invalid entry
          await cache.delete(key);
        }
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.value.compareTo(b.value));

    // Remove oldest entries
    final toRemove = entries.length - maxEntries;
    for (var i = 0; i < toRemove; i++) {
      await cache.delete(entries[i].key);
    }
  }

  /// Cleanup expired entries from all caches
  Future<void> cleanupExpiredEntries() async {
    await _cleanupExpired(_apiCache);
    await _cleanupExpired(_imageCache);
  }

  Future<void> _cleanupExpired(Box<String> cache) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final keysToRemove = <dynamic>[];

    for (final key in cache.keys) {
      final cached = cache.get(key);
      if (cached != null) {
        try {
          final data = jsonDecode(cached);
          final timestamp = data['timestamp'] as int;
          final maxAge = data['maxAge'] as int;
          if (now - timestamp > maxAge * 1000) {
            keysToRemove.add(key);
          }
        } catch (e) {
          keysToRemove.add(key);
        }
      }
    }

    for (final key in keysToRemove) {
      await cache.delete(key);
    }
  }
}
